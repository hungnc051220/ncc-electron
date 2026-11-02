import { isPaperVoucherMockMode } from "@renderer/api/paperVouchers.api";

/** Thông báo kết quả, ghi rõ khi thao tác chỉ áp dụng trên dữ liệu mẫu. */
export const getPaperVoucherResultMessage = (message: string) =>
  isPaperVoucherMockMode() ? `${message} trên dữ liệu mẫu (chưa lưu lên hệ thống)` : message;

export const PAPER_VOUCHER_NO_PERMISSION_MESSAGE = "Bạn không có quyền thực hiện thao tác này";
