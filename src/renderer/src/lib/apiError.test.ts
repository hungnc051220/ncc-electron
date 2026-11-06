import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import { describe, expect, it } from "vitest";
import {
  getApiErrorCode,
  getApiErrorDetails,
  getApiErrorMessage,
  getApiErrorStatus,
  getSafeApiErrorMessage,
  isRetryableApiError,
  SERVER_ERROR_HINT
} from "./apiError";

const createAxiosError = (status?: number, data?: unknown) => {
  const config = { headers: new AxiosHeaders() };
  const response =
    status === undefined
      ? undefined
      : ({ status, statusText: "", headers: {}, config, data } as AxiosResponse);

  return new AxiosError("Request failed", "ERR_TEST", config, undefined, response);
};

describe("apiError", () => {
  it("keeps reading the backend message as before", () => {
    expect(getApiErrorMessage(createAxiosError(400, { message: ["A", " ", "B"] }), "x")).toBe(
      "A, B"
    );
    expect(getApiErrorMessage(createAxiosError(400, { message: "Lỗi nghiệp vụ" }), "x")).toBe(
      "Lỗi nghiệp vụ"
    );
    expect(getApiErrorMessage(createAxiosError(500, {}), "x")).toBe("Request failed");
    expect(getApiErrorMessage(new Error("boom"), "x")).toBe("boom");
    expect(getApiErrorMessage(undefined, "fallback")).toBe("fallback");
  });

  it("reads the business error code and details from the response body", () => {
    const quote = { quoteHash: "a".repeat(64) };
    const error = createAxiosError(409, {
      statusCode: 409,
      code: "PAPER_VOUCHER_QUOTE_CHANGED",
      message: "Báo giá đã thay đổi",
      details: { quote }
    });

    expect(getApiErrorCode(error)).toBe("PAPER_VOUCHER_QUOTE_CHANGED");
    expect(getApiErrorDetails(error)).toEqual({ quote });
    expect(getApiErrorStatus(error)).toBe(409);
  });

  it("ignores missing or non-string codes and non-Axios errors", () => {
    expect(getApiErrorCode(createAxiosError(400, { code: 123 }))).toBeUndefined();
    expect(getApiErrorCode(createAxiosError(400, { code: " " }))).toBeUndefined();
    expect(getApiErrorCode(createAxiosError())).toBeUndefined();
    expect(getApiErrorCode(new Error("PAPER_VOUCHER_QUOTE_CHANGED"))).toBeUndefined();
    expect(getApiErrorDetails(new Error("x"))).toBeUndefined();
    expect(getApiErrorStatus(new Error("x"))).toBeUndefined();
  });

  it("treats missing responses and 5xx as retryable, other errors as final", () => {
    expect(isRetryableApiError(createAxiosError())).toBe(true);
    expect(isRetryableApiError(createAxiosError(500))).toBe(true);
    expect(isRetryableApiError(createAxiosError(503))).toBe(true);
    expect(isRetryableApiError(createAxiosError(400))).toBe(false);
    expect(isRetryableApiError(createAxiosError(409))).toBe(false);
    expect(isRetryableApiError(new Error("x"))).toBe(false);
  });

  describe("getSafeApiErrorMessage (QA01-F1)", () => {
    const rawSqlMessage =
      "The INSERT permission was denied on the object 'StaffAuditLog', database 'CinemaTicketDev'";
    const expectedServerMessage = `Xóa lô thất bại. ${SERVER_ERROR_HINT}`;

    it.each([
      ["a 500 carrying the raw SQL error (old backend)", 500, { message: rawSqlMessage }],
      ["a 500 without a body", 500, undefined],
      [
        "the generic 500 of the new backend",
        500,
        { statusCode: 500, code: "INTERNAL_SERVER_ERROR", message: "Hệ thống gặp lỗi" }
      ],
      ["a 502 from a proxy page", 502, "<html>Bad Gateway</html>"]
    ])("hides the server text of %s", (_label, status, data) => {
      const actualMessage = getSafeApiErrorMessage(
        createAxiosError(status, data),
        "Xóa lô thất bại"
      );

      expect(actualMessage).toBe(expectedServerMessage);
      expect(actualMessage).not.toContain("StaffAuditLog");
    });

    it.each([
      ["a 409 business error", 409, { code: "PAPER_VOUCHER_BATCH_IN_USE", message: "Lô đã dùng" }],
      ["a 400 without a code", 400, { message: "Order not found" }],
      [
        "a 503 with a business code",
        503,
        { code: "PAPER_VOUCHER_REQUEST_GUARD_UNAVAILABLE", message: "Thử lại với cùng mã" }
      ],
      [
        "a 502 with a business code",
        502,
        { code: "PAPER_VOUCHER_IMAGE_UPLOAD_FAILED", message: "Tải ảnh lỗi" }
      ]
    ])("keeps the backend message of %s", (_label, status, data) => {
      expect(getSafeApiErrorMessage(createAxiosError(status, data), "x")).toBe(data.message);
    });

    it("keeps the validation list, network and fallback behaviour of getApiErrorMessage", () => {
      expect(getSafeApiErrorMessage(createAxiosError(422, { message: ["A", "B"] }), "x")).toBe(
        "A, B"
      );
      expect(getSafeApiErrorMessage(createAxiosError(), "x")).toBe("Request failed");
      expect(getSafeApiErrorMessage(undefined, "fallback")).toBe("fallback");
    });
  });
});
