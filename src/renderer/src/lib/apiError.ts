import axios from "axios";

/** Body lỗi backend: `{ statusCode, code, message, details? }`. */
type ApiErrorPayload = {
  message?: string | string[];
  code?: unknown;
  details?: unknown;
};

/** Mã lỗi nghiệp vụ backend (`response.data.code`), vd. `PAPER_VOUCHER_QUOTE_CHANGED`. */
export const getApiErrorCode = (error: unknown): string | undefined => {
  if (!axios.isAxiosError<ApiErrorPayload>(error)) return undefined;

  const code = error.response?.data?.code;
  return typeof code === "string" && code.trim() ? code : undefined;
};

/** `response.data.details` của lỗi backend; caller tự kiểm tra shape trước khi dùng. */
export const getApiErrorDetails = (error: unknown): unknown =>
  axios.isAxiosError<ApiErrorPayload>(error) ? error.response?.data?.details : undefined;

/** HTTP status của lỗi Axios; `undefined` khi không nhận được phản hồi. */
export const getApiErrorStatus = (error: unknown): number | undefined =>
  axios.isAxiosError(error) ? error.response?.status : undefined;

/**
 * Không nhận được phản hồi (mất mạng, timeout, hủy) hoặc máy chủ lỗi 5xx: request có thể đã được
 * xử lý, nên lần gửi lại phải dùng cùng khóa idempotency.
 */
export const isRetryableApiError = (error: unknown) => {
  if (!axios.isAxiosError(error)) return false;

  const status = getApiErrorStatus(error);
  return status === undefined || status >= 500;
};

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    const responseMessage = error.response?.data?.message;

    if (Array.isArray(responseMessage)) {
      const messages = responseMessage.filter(
        (message): message is string => typeof message === "string" && message.trim().length > 0
      );

      if (messages.length > 0) {
        return messages.join(", ");
      }
    }

    if (typeof responseMessage === "string" && responseMessage.trim()) {
      return responseMessage;
    }

    if (typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
};
