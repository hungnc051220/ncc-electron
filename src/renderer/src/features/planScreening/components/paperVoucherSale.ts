import {
  getApiErrorCode,
  getApiErrorDetails,
  getApiErrorMessage,
  getApiErrorStatus,
  isRetryableApiError
} from "@renderer/lib/apiError";
import type { PaperVoucherOrderQuote } from "@shared/types";

/**
 * Bật bán vé có voucher giấy tại POS (`VITE_PAPER_VOUCHER_SALE_ENABLED=true` lúc build).
 * Không khai báo hoặc giá trị khác: vẫn chặn in vé khi đang chọn voucher giấy.
 */
export const isPaperVoucherSaleEnabled = () =>
  import.meta.env.VITE_PAPER_VOUCHER_SALE_ENABLED?.trim().toLowerCase() === "true";

/** Giai đoạn 1: voucher giấy chỉ dùng với thanh toán tiền mặt tại quầy. */
export const PAPER_VOUCHER_PAYMENT_METHOD = "POS";

export const PAPER_VOUCHER_BLOCKS_SALE_MESSAGE =
  "Hệ thống chưa ghi nhận voucher giấy vào đơn bán vé. Bỏ áp dụng voucher trước khi in vé.";
export const PAPER_VOUCHER_CASH_ONLY_MESSAGE =
  "Voucher giấy chỉ áp dụng khi thanh toán tiền mặt tại quầy";
export const PAPER_VOUCHER_RESERVE_BLOCKED_MESSAGE =
  "Không thể giữ chỗ khi đang áp dụng voucher giấy. Bỏ áp dụng voucher hoặc in vé ngay.";
export const PAPER_VOUCHER_QUOTE_PENDING_MESSAGE =
  "Đang tính số tiền khách cần trả, vui lòng chờ trong giây lát";
export const PAPER_VOUCHER_QUOTE_CHANGED_MESSAGE =
  "Số tiền khách cần trả đã thay đổi. Kiểm tra lại số tiền rồi bấm In vé để xác nhận.";
export const PAPER_VOUCHER_NETWORK_ERROR_MESSAGE =
  "Không nhận được phản hồi từ máy chủ. Bấm In vé để thử lại, voucher giấy không bị ghi nhận trùng.";

/** `code` trong body lỗi backend (luôn có tiền tố `PAPER_VOUCHER_`). */
export const PAPER_VOUCHER_ERROR_CODES = {
  quoteChanged: "PAPER_VOUCHER_QUOTE_CHANGED",
  requestIdConflict: "PAPER_VOUCHER_REQUEST_ID_CONFLICT",
  requestAlreadyCancelled: "PAPER_VOUCHER_REQUEST_ALREADY_CANCELLED",
  ticketPriceUndetermined: "PAPER_VOUCHER_TICKET_PRICE_UNDETERMINED"
} as const;

/** Lô/số lượng đã đổi so với lúc báo giá: tải lại danh sách lô và báo giá lại. */
const STALE_BATCH_ERROR_CODES = new Set([
  "PAPER_VOUCHER_BATCH_NOT_FOUND",
  "PAPER_VOUCHER_BATCH_LOCKED",
  "PAPER_VOUCHER_BATCH_EXPIRED",
  "PAPER_VOUCHER_BATCH_NOT_STARTED",
  "PAPER_VOUCHER_FACE_VALUE_CHANGED",
  "PAPER_VOUCHER_INSUFFICIENT_QUANTITY",
  "PAPER_VOUCHER_CONCURRENT_CONFLICT"
]);

const isPaperVoucherOrderQuote = (value: unknown): value is PaperVoucherOrderQuote => {
  if (!value || typeof value !== "object") return false;

  const quote = value as Partial<PaperVoucherOrderQuote>;
  return (
    typeof quote.quoteHash === "string" &&
    typeof quote.finalOrderTotal === "number" &&
    typeof quote.baseTotal === "number" &&
    !!quote.paperVoucher &&
    typeof quote.paperVoucher === "object"
  );
};

/**
 * Phân loại lỗi tạo đơn có voucher giấy (đọc `code`, không chỉ `message`):
 * - `quote-changed`: 409 báo giá đổi, kèm báo giá mới (nếu có) để thay thế. Thu ngân xác nhận lại
 *   rồi gửi cùng mã request với hash/số tiền mới.
 * - `retryable`: mất mạng/5xx, gửi lại y nguyên cùng mã request (backend trả lại đơn đã tạo).
 * - `stale-batch`: lô/số lượng đã đổi, tải lại lô và báo giá lại; lần gửi sau dùng mã mới.
 * - `rejected`: lỗi 4xx khác (gồm trùng/hủy mã request), lần gửi sau là lần bán mới với mã mới.
 */
export type PaperVoucherOrderFailure =
  | { kind: "quote-changed"; quote?: PaperVoucherOrderQuote }
  | { kind: "retryable"; message: string }
  | { kind: "stale-batch"; message: string }
  | { kind: "rejected"; message: string };

export const classifyPaperVoucherOrderError = (error: unknown): PaperVoucherOrderFailure => {
  const code = getApiErrorCode(error);

  if (code === PAPER_VOUCHER_ERROR_CODES.quoteChanged) {
    const details = getApiErrorDetails(error) as { quote?: unknown } | undefined;
    const quote = isPaperVoucherOrderQuote(details?.quote) ? details.quote : undefined;
    return { kind: "quote-changed", quote };
  }

  if (code && STALE_BATCH_ERROR_CODES.has(code)) {
    return { kind: "stale-batch", message: getApiErrorMessage(error, "Voucher giấy đã thay đổi") };
  }

  if (isRetryableApiError(error)) {
    const hasResponse = getApiErrorStatus(error) !== undefined;
    return {
      kind: "retryable",
      message: hasResponse
        ? getApiErrorMessage(error, PAPER_VOUCHER_NETWORK_ERROR_MESSAGE)
        : PAPER_VOUCHER_NETWORK_ERROR_MESSAGE
    };
  }

  return { kind: "rejected", message: getApiErrorMessage(error, "Tạo đơn thất bại") };
};

const formatUuidV4 = (bytes: Uint8Array) => {
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

/** Khóa idempotency (UUID v4) cho một lần bán vé có voucher giấy. */
export const createPaperVoucherRequestId = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : formatUuidV4(crypto.getRandomValues(new Uint8Array(16)));
