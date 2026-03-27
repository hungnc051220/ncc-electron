import axios from "axios";

type ApiErrorPayload = {
  message?: string | string[];
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
