import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it } from "vitest";
import {
  appendUpdateErrorLog,
  classifyUpdateError,
  createUpdateErrorLogEntry,
  createUpdateErrorPayload,
  sanitizeUpdateErrorText
} from "./update-error";

const createHttpError = (statusCode: number, message: string) =>
  Object.assign(new Error(message), { name: "HttpError", statusCode });

describe("classifyUpdateError", () => {
  it.each([
    ["net::ERR_INTERNET_DISCONNECTED", "check"],
    ["getaddrinfo ENOTFOUND github.com", "check"],
    ["connect ETIMEDOUT 140.82.112.3:443", "download"],
    ["net::ERR_CONNECTION_RESET", "download"]
  ] as const)("maps network failure %s during %s to UPDATE_NETWORK", (inputMessage, inputStage) => {
    expect(classifyUpdateError(new Error(inputMessage), inputStage)).toBe("UPDATE_NETWORK");
  });

  it("maps GitHub metadata HTTP errors during check to UPDATE_METADATA_UNAVAILABLE", () => {
    const inputError = createHttpError(
      404,
      'Cannot find latest.yml in the latest release artifacts (https://github.com/o/r/releases/download/v1/latest.yml): HttpError: 404\nHeaders: {"server":"github.com"}'
    );

    expect(classifyUpdateError(inputError, "check")).toBe("UPDATE_METADATA_UNAVAILABLE");
  });

  it("maps electron-updater ERR_UPDATER_* codes during check to UPDATE_METADATA_UNAVAILABLE", () => {
    const inputError = Object.assign(new Error("No published versions"), {
      code: "ERR_UPDATER_NO_PUBLISHED_VERSIONS"
    });

    expect(classifyUpdateError(inputError, "check")).toBe("UPDATE_METADATA_UNAVAILABLE");
  });

  it("maps non-network download failures to UPDATE_DOWNLOAD_FAILED", () => {
    expect(classifyUpdateError(new Error("sha512 checksum mismatch"), "download")).toBe(
      "UPDATE_DOWNLOAD_FAILED"
    );
  });

  it("maps install failures to UPDATE_INSTALL_FAILED even when they look like network errors", () => {
    expect(classifyUpdateError(new Error("spawn EACCES ECONNRESET"), "install")).toBe(
      "UPDATE_INSTALL_FAILED"
    );
  });

  it("maps Linux pkexec failures to UPDATE_MANUAL_INSTALL_REQUIRED", () => {
    expect(classifyUpdateError(new Error("pkexec failed with error code 127"), "install")).toBe(
      "UPDATE_MANUAL_INSTALL_REQUIRED"
    );
  });

  it("maps unrecognized check failures and non-Error values to UPDATE_UNKNOWN", () => {
    expect(classifyUpdateError(new Error("boom"), "check")).toBe("UPDATE_UNKNOWN");
    expect(classifyUpdateError(undefined, "check")).toBe("UPDATE_UNKNOWN");
  });
});

describe("createUpdateErrorPayload", () => {
  it("marks install and manual-install errors as not retryable", () => {
    expect(createUpdateErrorPayload("UPDATE_INSTALL_FAILED", "install").retryable).toBe(false);
    expect(createUpdateErrorPayload("UPDATE_MANUAL_INSTALL_REQUIRED", "install").retryable).toBe(
      false
    );
    expect(createUpdateErrorPayload("UPDATE_NETWORK", "check")).toEqual({
      code: "UPDATE_NETWORK",
      stage: "check",
      retryable: true
    });
  });
});

describe("sanitizeUpdateErrorText", () => {
  it("redacts tokens, secrets and signed query strings but keeps the URL path", () => {
    const inputText = [
      "GET https://objects.githubusercontent.com/asset/1.exe?X-Amz-Signature=abc&sig=def",
      'Headers: {"authorization":"token ghp_abcdefghijklmnopqrstuvwxyz0123","set-cookie":["a=b"]}',
      "password=hunter2 secret: s3cr3t Bearer eyJhbGciOiJIUzI1NiJ9.payload"
    ].join("\n");

    const actualText = sanitizeUpdateErrorText(inputText);

    expect(actualText).toContain("https://objects.githubusercontent.com/asset/1.exe?[REDACTED]");
    expect(actualText).not.toMatch(/X-Amz-Signature=abc|ghp_|hunter2|s3cr3t|eyJhbGci|a=b/);
  });

  it("truncates very long technical text", () => {
    const actualText = sanitizeUpdateErrorText("x".repeat(5000));

    expect(actualText.length).toBeLessThan(2100);
    expect(actualText.endsWith("[truncated]")).toBe(true);
  });
});

describe("createUpdateErrorLogEntry", () => {
  it("keeps the technical details developers need", () => {
    const inputError = Object.assign(createHttpError(503, "Service Unavailable"), {
      code: "ERR_UPDATER_INVALID_RELEASE_FEED"
    });

    const actualEntry = createUpdateErrorLogEntry({
      error: inputError,
      code: "UPDATE_METADATA_UNAVAILABLE",
      stage: "check",
      source: "autoUpdater:error",
      appVersion: "1.0.122",
      platform: "win32",
      now: new Date("2026-11-11T03:00:00.000Z")
    });

    expect(actualEntry).toMatchObject({
      timestamp: "2026-11-11T03:00:00.000Z",
      code: "UPDATE_METADATA_UNAVAILABLE",
      stage: "check",
      source: "autoUpdater:error",
      appVersion: "1.0.122",
      platform: "win32",
      errorName: "HttpError",
      errorCode: "ERR_UPDATER_INVALID_RELEASE_FEED",
      statusCode: 503,
      message: "Service Unavailable"
    });
    expect(actualEntry.stack).toContain("Service Unavailable");
  });
});

describe("appendUpdateErrorLog", () => {
  let tempDir: string | null = null;

  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  });

  it("appends one JSON line per error", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "updater-log-"));
    const inputPath = join(tempDir, "logs", "updater.log");
    const inputEntry = createUpdateErrorLogEntry({
      error: new Error("net::ERR_INTERNET_DISCONNECTED"),
      code: "UPDATE_NETWORK",
      stage: "check",
      source: "checkForUpdates",
      appVersion: "1.0.122"
    });

    await appendUpdateErrorLog(inputPath, inputEntry);
    await appendUpdateErrorLog(inputPath, inputEntry);

    const actualLines = (await readFile(inputPath, "utf-8")).trim().split("\n");
    expect(actualLines).toHaveLength(2);
    expect(JSON.parse(actualLines[0])).toMatchObject({ code: "UPDATE_NETWORK", stage: "check" });
  });
});
