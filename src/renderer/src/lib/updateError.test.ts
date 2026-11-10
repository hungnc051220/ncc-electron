import { describe, expect, it } from "vitest";
import { getUpdateErrorContent, normalizeUpdateErrorPayload } from "./updateError";

describe("getUpdateErrorContent", () => {
  it.each([
    [
      { code: "UPDATE_NETWORK", stage: "check", retryable: true },
      "Không thể kiểm tra cập nhật",
      "Không thể kiểm tra bản cập nhật. Vui lòng kiểm tra Internet và thử lại."
    ],
    [
      { code: "UPDATE_DOWNLOAD_FAILED", stage: "download", retryable: true },
      "Tải bản cập nhật thất bại",
      "Tải bản cập nhật thất bại. Vui lòng thử lại sau."
    ],
    [
      { code: "UPDATE_INSTALL_FAILED", stage: "install", retryable: false },
      "Không thể cài đặt bản cập nhật",
      "Không thể cài đặt bản cập nhật. Vui lòng liên hệ bộ phận kỹ thuật."
    ],
    [
      { code: "UPDATE_UNKNOWN", stage: "check", retryable: true },
      "Cập nhật không thành công",
      "Cập nhật ứng dụng không thành công. Vui lòng thử lại."
    ]
  ] as const)(
    "returns a short friendly message for %o",
    (inputPayload, expectedTitle, expectedText) => {
      const actualContent = getUpdateErrorContent(inputPayload);

      expect(actualContent.title).toBe(expectedTitle);
      expect(actualContent.description).toBe(expectedText);
    }
  );

  it("uses a warning severity for network problems and error severity otherwise", () => {
    expect(
      getUpdateErrorContent({ code: "UPDATE_NETWORK", stage: "download", retryable: true })
    ).toMatchObject({
      severity: "warning",
      description: "Tải bản cập nhật thất bại. Vui lòng kiểm tra Internet và thử lại sau."
    });
    expect(
      getUpdateErrorContent({
        code: "UPDATE_METADATA_UNAVAILABLE",
        stage: "check",
        retryable: true
      }).severity
    ).toBe("error");
  });
});

describe("normalizeUpdateErrorPayload", () => {
  it("never passes a raw error string through to the UI", () => {
    const inputRawMessage =
      'Cannot find latest.yml (https://github.com/o/r/releases/download/v1/latest.yml): HttpError: 404\nHeaders: {"a":"b"}\n    at GitHubProvider.getLatestVersion (C:\\app\\resources\\app.asar\\node_modules\\electron-updater\\out\\providers\\GitHubProvider.js:1:1)';

    const actualPayload = normalizeUpdateErrorPayload(inputRawMessage);
    const actualContent = getUpdateErrorContent(actualPayload);

    expect(actualPayload).toEqual({ code: "UPDATE_UNKNOWN", stage: "check", retryable: true });
    expect(`${actualContent.title} ${actualContent.description}`).not.toMatch(
      /github|HttpError|latest\.yml|app\.asar|Headers/
    );
  });

  it("keeps a valid payload and defaults retryable by stage", () => {
    expect(
      normalizeUpdateErrorPayload({ code: "UPDATE_DOWNLOAD_FAILED", stage: "download" })
    ).toEqual({ code: "UPDATE_DOWNLOAD_FAILED", stage: "download", retryable: true });
    expect(
      normalizeUpdateErrorPayload({ code: "UPDATE_INSTALL_FAILED", stage: "install" })
    ).toEqual({ code: "UPDATE_INSTALL_FAILED", stage: "install", retryable: false });
  });
});
