import axios from "axios";

export const getPrintErrorMessage = (error: unknown) => {
  const fallback = "Không thể in vé. Vui lòng kiểm tra máy in và thử lại.";

  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : axios.isAxiosError(error)
          ? error.message
          : "";

  const normalizedMessage = rawMessage.toLowerCase();

  if (!normalizedMessage) return fallback;

  if (
    normalizedMessage.includes("print job canceled") ||
    normalizedMessage.includes("print job cancelled") ||
    normalizedMessage.includes("canceled") ||
    normalizedMessage.includes("cancelled")
  ) {
    return "Bạn đã hủy thao tác in hoặc đóng cửa sổ lưu file. Vé chưa được in.";
  }

  if (normalizedMessage.includes("no printer selected")) {
    return "Chưa chọn máy in mặc định. Vui lòng kiểm tra cấu hình máy in.";
  }

  if (
    normalizedMessage.includes("out of paper") ||
    normalizedMessage.includes("paper out") ||
    normalizedMessage.includes("paper empty")
  ) {
    return "Máy in đã hết giấy. Vui lòng nạp giấy và in lại.";
  }

  if (
    normalizedMessage.includes("offline") ||
    normalizedMessage.includes("not available") ||
    normalizedMessage.includes("not found") ||
    normalizedMessage.includes("invalid printer")
  ) {
    return "Không tìm thấy máy in hoặc máy in đang offline. Vui lòng kiểm tra lại.";
  }

  if (
    normalizedMessage.includes("door open") ||
    normalizedMessage.includes("cover open") ||
    normalizedMessage.includes("jam") ||
    normalizedMessage.includes("busy")
  ) {
    return "Máy in đang gặp sự cố. Vui lòng kiểm tra trạng thái máy in rồi thử lại.";
  }

  return `${fallback}${rawMessage ? ` (${rawMessage})` : ""}`;
};
