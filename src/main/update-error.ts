import { appendFile, mkdir, rename, stat } from "fs/promises";
import { dirname } from "path";
import type { UpdateErrorCode, UpdateErrorPayload, UpdateErrorStage } from "@shared/types";

const MAX_TEXT_LENGTH = 2000;
const MAX_LOG_FILE_BYTES = 1024 * 1024;

const NETWORK_ERROR_PATTERN =
  /net::ERR_(INTERNET_DISCONNECTED|NAME_NOT_RESOLVED|NAME_RESOLUTION_FAILED|CONNECTION_[A-Z_]+|NETWORK_[A-Z_]+|ADDRESS_UNREACHABLE|TIMED_OUT|PROXY_[A-Z_]+)|\b(ENOTFOUND|ECONNREFUSED|ECONNRESET|ECONNABORTED|ETIMEDOUT|EAI_AGAIN|ENETUNREACH|ENETDOWN|EHOSTUNREACH)\b|socket hang up|getaddrinfo/i;
const LINUX_ELEVATION_PATTERN = /pkexec|polkit|error code 127/i;
const SENSITIVE_KEY_PATTERN =
  /("?(?:authorization|proxy-authorization|cookie|set-cookie|x-api-key|api[-_]?key|access[-_]?token|refresh[-_]?token|token|password|passwd|secret)"?\s*[:=]\s*)("[^"]*"|\[[^\]]*\]|[^\s,;}]+)/gi;
const GITHUB_TOKEN_PATTERN = /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g;
const BEARER_PATTERN = /\b(Bearer|Basic|token)\s+[A-Za-z0-9._~+/=-]{8,}/gi;
const URL_QUERY_PATTERN = /(https?:\/\/[^\s?"'#]+)\?[^\s"'#]*/gi;

export interface UpdateErrorLogEntry {
  timestamp: string;
  code: UpdateErrorCode;
  stage: UpdateErrorStage;
  source: string;
  appVersion: string;
  platform: string;
  errorName?: string;
  errorCode?: string;
  statusCode?: number;
  message: string;
  stack?: string;
}

interface ErrorLike {
  name?: unknown;
  message?: unknown;
  code?: unknown;
  statusCode?: unknown;
  stack?: unknown;
}

const asErrorLike = (error: unknown): ErrorLike =>
  error && typeof error === "object" ? (error as ErrorLike) : {};

const readString = (value: unknown) => (typeof value === "string" ? value : undefined);

const getErrorText = (error: unknown) => {
  const raw = asErrorLike(error);
  return [readString(raw.code), readString(raw.message) ?? String(error)].filter(Boolean).join(" ");
};

const isMetadataError = (error: unknown) => {
  const raw = asErrorLike(error);
  const code = readString(raw.code) ?? "";

  return (
    code.startsWith("ERR_UPDATER_") ||
    code.startsWith("ERR_XML_") ||
    typeof raw.statusCode === "number" ||
    readString(raw.name) === "HttpError"
  );
};

export function classifyUpdateError(error: unknown, stage: UpdateErrorStage): UpdateErrorCode {
  const text = getErrorText(error);

  if (LINUX_ELEVATION_PATTERN.test(text)) return "UPDATE_MANUAL_INSTALL_REQUIRED";
  if (stage === "install") return "UPDATE_INSTALL_FAILED";
  if (NETWORK_ERROR_PATTERN.test(text)) return "UPDATE_NETWORK";
  if (stage === "download") return "UPDATE_DOWNLOAD_FAILED";
  if (isMetadataError(error)) return "UPDATE_METADATA_UNAVAILABLE";

  return "UPDATE_UNKNOWN";
}

export function createUpdateErrorPayload(
  code: UpdateErrorCode,
  stage: UpdateErrorStage
): UpdateErrorPayload {
  const retryable = code !== "UPDATE_INSTALL_FAILED" && code !== "UPDATE_MANUAL_INSTALL_REQUIRED";

  return { code, stage, retryable };
}

/** Che token/secret/query string ký (URL tải GitHub) và cắt ngắn trước khi ghi log. */
export function sanitizeUpdateErrorText(value: string): string {
  const sanitized = value
    .replace(URL_QUERY_PATTERN, "$1?[REDACTED]")
    .replace(GITHUB_TOKEN_PATTERN, "[REDACTED]")
    .replace(BEARER_PATTERN, "$1 [REDACTED]")
    .replace(SENSITIVE_KEY_PATTERN, '$1"[REDACTED]"');

  return sanitized.length > MAX_TEXT_LENGTH
    ? `${sanitized.slice(0, MAX_TEXT_LENGTH)}…[truncated]`
    : sanitized;
}

interface CreateUpdateErrorLogEntryOptions {
  error: unknown;
  code: UpdateErrorCode;
  stage: UpdateErrorStage;
  source: string;
  appVersion: string;
  platform?: string;
  now?: Date;
}

export function createUpdateErrorLogEntry(
  options: CreateUpdateErrorLogEntryOptions
): UpdateErrorLogEntry {
  const raw = asErrorLike(options.error);
  const message = readString(raw.message) ?? String(options.error);
  const stack = readString(raw.stack);

  return {
    timestamp: (options.now ?? new Date()).toISOString(),
    code: options.code,
    stage: options.stage,
    source: options.source,
    appVersion: options.appVersion,
    platform: options.platform ?? process.platform,
    errorName: readString(raw.name),
    errorCode: readString(raw.code),
    statusCode: typeof raw.statusCode === "number" ? raw.statusCode : undefined,
    message: sanitizeUpdateErrorText(message),
    stack: stack ? sanitizeUpdateErrorText(stack) : undefined
  };
}

/** Ghi một dòng JSON vào file log updater; xoay vòng sang `.old` khi vượt 1MB. Không bao giờ throw. */
export async function appendUpdateErrorLog(logFilePath: string, entry: UpdateErrorLogEntry) {
  try {
    await mkdir(dirname(logFilePath), { recursive: true });
    const current = await stat(logFilePath).catch(() => null);

    if (current && current.size > MAX_LOG_FILE_BYTES) {
      await rename(logFilePath, `${logFilePath}.old`);
    }

    await appendFile(logFilePath, `${JSON.stringify(entry)}\n`, "utf-8");
  } catch (error) {
    console.error("[updater] write error log failed", error);
  }
}
