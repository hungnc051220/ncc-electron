import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import { describe, expect, it } from "vitest";
import {
  getApiErrorCode,
  getApiErrorDetails,
  getApiErrorMessage,
  getApiErrorStatus,
  isRetryableApiError
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
});
