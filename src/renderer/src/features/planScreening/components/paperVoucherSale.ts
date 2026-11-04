import {
  getApiErrorCode,
  getApiErrorDetails,
  getApiErrorMessage,
  getApiErrorStatus,
  isRetryableApiError
} from "@renderer/lib/apiError";
import { formatPaymentMethod } from "@renderer/lib/utils";
import {
  PaymentType,
  type OrderResponseProps,
  type PaperVoucherOrderQuote,
  type PaperVoucherRequestStatus,
  type QrDialogData
} from "@shared/types";

/**
 * Voucher giấy là một nguồn thanh toán (tương đương tiền mặt), không phải giảm giá: tổng đơn giữ
 * nguyên, voucher trả một phần, phần còn lại trả bằng tiền mặt (`POS`) hoặc VietQR khi backend cho
 * phép (`allowedPaymentMethods` của báo giá). Không bao giờ dùng VNPayQR.
 *
 * Báo giá không phụ thuộc phương thức thanh toán nên luôn gửi `POS`; đổi phương thức không báo giá lại.
 */
export const PAPER_VOUCHER_CASH_METHOD: string = PaymentType.POS;

export const PAPER_VOUCHER_PAYMENT_HINT =
  "Đơn có voucher giấy: phần còn lại trả bằng tiền mặt, hoặc VietQR khi hệ thống cho phép. Không dùng VNPayQR.";
export const PAPER_VOUCHER_RESERVE_BLOCKED_MESSAGE =
  "Không thể giữ chỗ khi đang áp dụng voucher giấy. Bỏ áp dụng voucher hoặc in vé ngay.";
export const PAPER_VOUCHER_QUOTE_PENDING_MESSAGE =
  "Đang tính số tiền khách cần thanh toán thêm, vui lòng chờ trong giây lát";
export const PAPER_VOUCHER_QUOTE_CHANGED_MESSAGE =
  "Số tiền đã thay đổi. Kiểm tra lại số tiền khách cần thanh toán thêm rồi bấm In vé để xác nhận.";
export const PAPER_VOUCHER_NETWORK_ERROR_MESSAGE =
  "Không nhận được phản hồi từ máy chủ. Bấm In vé để thử lại, voucher giấy không bị ghi nhận trùng.";
export const PAPER_VOUCHER_REQUEST_IN_PROGRESS_MESSAGE =
  "Lần bán trước đang được máy chủ xử lý. Chờ vài giây rồi bấm In vé để kiểm tra lại, không bán lại.";
export const PAPER_VOUCHER_RECONCILE_FAILED_MESSAGE =
  "Chưa kiểm tra được kết quả lần bán trước. Thử lại sau; chưa tạo giao dịch mới.";
export const PAPER_VOUCHER_PREVIOUS_NOT_RECORDED_MESSAGE =
  "Lần bán trước không được ghi nhận. Kiểm tra lại số tiền rồi bấm In vé để bán.";

/**
 * Lần bán trước đã tạo đơn: không tạo đơn mới với lựa chọn/phương thức khác. Đơn QR đang giữ voucher
 * (`held`) chưa được thanh toán: không báo như đã thu tiền.
 */
export const getPaperVoucherExistingOrderMessage = (order: OrderResponseProps) => {
  const method = formatPaymentMethod(
    order.paperVoucher?.paymentMethodSystemName ?? order.paymentMethodSystemName ?? PaymentType.POS
  );
  const state =
    order.paperVoucher?.status === "held"
      ? `đang chờ thanh toán ${method}, chưa thu tiền`
      : `đã thanh toán, ${method}`;
  return `Lần bán trước đã tạo đơn #${order.id} (${state}). Không tạo đơn mới; kiểm tra đơn này trong lịch sử đơn hàng.`;
};

/** Báo giá không cho phép cả tiền mặt (không xảy ra nếu backend đúng hợp đồng): chặn bán. */
export const PAPER_VOUCHER_NO_PAYMENT_METHOD_MESSAGE =
  "Không có phương thức thanh toán hợp lệ cho đơn có voucher giấy này. Bỏ áp dụng voucher hoặc thử lại.";

/** Phương thức đang chọn không còn hợp lệ với voucher giấy: chuyển sang tiền mặt và báo thu ngân. */
export const getPaperVoucherPaymentFallbackMessage = (paymentMethod: string) =>
  `${formatPaymentMethod(paymentMethod)} không dùng được cho đơn có voucher giấy này. Đã chuyển sang tiền mặt.`;

/** `code` trong body lỗi backend (luôn có tiền tố `PAPER_VOUCHER_`). */
export const PAPER_VOUCHER_ERROR_CODES = {
  quoteChanged: "PAPER_VOUCHER_QUOTE_CHANGED",
  requestIdConflict: "PAPER_VOUCHER_REQUEST_ID_CONFLICT",
  requestAlreadyCancelled: "PAPER_VOUCHER_REQUEST_ALREADY_CANCELLED",
  requestInProgress: "PAPER_VOUCHER_REQUEST_IN_PROGRESS",
  paymentMethodNotAllowed: "PAPER_VOUCHER_PAYMENT_METHOD_NOT_ALLOWED",
  qrPaymentNotConfirmed: "PAPER_VOUCHER_QR_PAYMENT_NOT_CONFIRMED"
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

const QUOTE_AMOUNT_FIELDS = [
  "orderTotal",
  "voucherApplied",
  "remainingPayable",
  "excessAmount"
] as const;

const isPaperVoucherOrderQuote = (value: unknown): value is PaperVoucherOrderQuote => {
  if (!value || typeof value !== "object") return false;

  const quote = value as Partial<PaperVoucherOrderQuote>;
  return (
    typeof quote.quoteHash === "string" &&
    QUOTE_AMOUNT_FIELDS.every((field) => typeof quote[field] === "number") &&
    Array.isArray(quote.allowedPaymentMethods) &&
    Array.isArray(quote.lines)
  );
};

/**
 * Phương thức thanh toán phần còn lại có dùng được với voucher giấy không. VNPayQR không bao giờ;
 * chưa có báo giá (`allowedMethods` trống) thì chưa loại tiền mặt/VietQR, báo giá về sẽ kiểm lại.
 */
export const isPaperVoucherPaymentMethodAllowed = (
  paymentMethod: string,
  allowedMethods?: readonly string[]
) =>
  paymentMethod !== PaymentType.VNPAY &&
  (!allowedMethods || allowedMethods.includes(paymentMethod));

/**
 * Số tiền khách trả qua QR: đơn có voucher giấy chỉ trả phần còn lại (`transactionAmount` của
 * `create-qr`, dự phòng `remainingPayable`); đơn thường trả cả đơn như trước.
 */
export const getQrPayableAmount = (
  data: Pick<QrDialogData, "orderTotal" | "transactionAmount" | "paperVoucher">
) =>
  data.paperVoucher
    ? (data.transactionAmount ?? data.paperVoucher.remainingPayable)
    : data.orderTotal || 0;

/**
 * Phân loại lỗi tạo đơn có voucher giấy (đọc `code`, không chỉ `message`). Một mã request chỉ đi
 * với đúng một payload: payload khác (đổi phương thức, số tiền, lựa chọn) luôn dùng mã mới.
 * Chưa rõ kết quả (lần gửi có thể đã tạo đơn):
 * - `retryable`: mất mạng/5xx. Chỉ được gửi lại y nguyên cùng mã (backend trả lại đơn đã tạo);
 *   payload khác phải tra cứu mã cũ trước.
 * - `in-progress`: 409 lần gửi trước cùng mã còn đang chạy.
 * - `request-conflict`: 409 mã đã gắn với một payload khác; tra cứu trước khi bán.
 * Backend đã trả lời, lần gửi này không ghi gì (lần sau dùng mã mới):
 * - `quote-changed`: 409 báo giá đổi, kèm báo giá mới (nếu có) để thay thế và chờ xác nhận.
 * - `stale-batch`: lô/số lượng đã đổi, tải lại lô và báo giá lại.
 * - `payment-method-not-allowed`: phương thức không còn hợp lệ, chuyển tiền mặt và báo giá lại.
 * - `rejected`: lỗi 4xx khác (gồm mã request đã bị hủy).
 */
export type PaperVoucherOrderFailure =
  | { kind: "quote-changed"; quote?: PaperVoucherOrderQuote }
  | { kind: "retryable"; message: string }
  | { kind: "in-progress"; message: string }
  | { kind: "request-conflict"; message: string }
  | { kind: "stale-batch"; message: string }
  | { kind: "payment-method-not-allowed"; message: string }
  | { kind: "rejected"; message: string };

/** Lần gửi có thể đã tạo đơn: giữ mã và chỉ gửi lại y nguyên, hoặc tra cứu trước khi bán khác đi. */
export const isPaperVoucherOutcomeUnknown = (failure: PaperVoucherOrderFailure) =>
  failure.kind === "retryable" ||
  failure.kind === "in-progress" ||
  failure.kind === "request-conflict";

export const classifyPaperVoucherOrderError = (error: unknown): PaperVoucherOrderFailure => {
  const code = getApiErrorCode(error);

  if (code === PAPER_VOUCHER_ERROR_CODES.requestInProgress) {
    return { kind: "in-progress", message: PAPER_VOUCHER_REQUEST_IN_PROGRESS_MESSAGE };
  }

  if (code === PAPER_VOUCHER_ERROR_CODES.requestIdConflict) {
    return {
      kind: "request-conflict",
      message: getApiErrorMessage(error, "Mã giao dịch voucher đã được dùng cho một lần bán khác")
    };
  }

  if (code === PAPER_VOUCHER_ERROR_CODES.quoteChanged) {
    const details = getApiErrorDetails(error) as { quote?: unknown } | undefined;
    const quote = isPaperVoucherOrderQuote(details?.quote) ? details.quote : undefined;
    return { kind: "quote-changed", quote };
  }

  if (code && STALE_BATCH_ERROR_CODES.has(code)) {
    return { kind: "stale-batch", message: getApiErrorMessage(error, "Voucher giấy đã thay đổi") };
  }

  if (code === PAPER_VOUCHER_ERROR_CODES.paymentMethodNotAllowed) {
    return {
      kind: "payment-method-not-allowed",
      message: getApiErrorMessage(error, "Phương thức thanh toán không dùng được với voucher giấy")
    };
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

/**
 * Khóa so sánh payload tạo đơn (mọi field trừ mã request, thứ tự field không ảnh hưởng). Hai body
 * cùng khóa là cùng một lần bán, được gửi lại với cùng mã request.
 */
export const buildPaperVoucherPayloadKey = (body: object) => {
  const canonical = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonical);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key, item]) => key !== "paperVoucherRequestId" && item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonical(item)])
    );
  };
  return JSON.stringify(canonical(body));
};

/**
 * Lần gửi tạo đơn có voucher giấy gần nhất của máy POS. `outcomeUnknown`: không nhận được câu trả
 * dứt khoát (mất mạng/5xx/đang xử lý), đơn có thể đã được tạo. Lưu theo phiên để chuyển màn hình
 * hay mở lại ca chiếu vẫn phải đối soát trước khi tạo giao dịch mới.
 */
export interface PaperVoucherAttempt {
  requestId: string;
  payloadKey: string;
  outcomeUnknown: boolean;
}

const PAPER_VOUCHER_ATTEMPT_KEY = "paperVoucherPendingAttempt";

export const loadPaperVoucherAttempt = (): PaperVoucherAttempt | null => {
  try {
    const attempt = JSON.parse(sessionStorage.getItem(PAPER_VOUCHER_ATTEMPT_KEY) ?? "null");
    return typeof attempt?.requestId === "string" && typeof attempt?.payloadKey === "string"
      ? { ...attempt, outcomeUnknown: attempt.outcomeUnknown === true }
      : null;
  } catch {
    return null;
  }
};

export const savePaperVoucherAttempt = (attempt: PaperVoucherAttempt | null) => {
  if (attempt?.outcomeUnknown) {
    sessionStorage.setItem(PAPER_VOUCHER_ATTEMPT_KEY, JSON.stringify(attempt));
  } else {
    sessionStorage.removeItem(PAPER_VOUCHER_ATTEMPT_KEY);
  }
};

/**
 * Kết quả tra cứu mã request của lần gửi chưa rõ kết quả:
 * - `existing-order`: đơn đã tạo và còn hiệu lực (đã thu hoặc QR đang chờ): không tạo đơn mới.
 * - `in-progress`: lần gửi đó còn đang chạy: chờ, chưa tạo giao dịch mới.
 * - `free`: không có gì được ghi nhận, hoặc đơn đã hủy/trả voucher: được bán lại với mã mới.
 */
export type PaperVoucherReconcileDecision =
  | { kind: "existing-order"; order: OrderResponseProps }
  | { kind: "in-progress" }
  | { kind: "free" };

export const toPaperVoucherReconcileDecision = (
  status: PaperVoucherRequestStatus
): PaperVoucherReconcileDecision => {
  if (status.state === "not_found") return { kind: "free" };
  // Đã ghi nhận nhưng chưa đọc được đơn: chưa đủ chắc để bán lại.
  if (status.state !== "found" || !status.order) return { kind: "in-progress" };

  const redemptionStatus = status.order.paperVoucher?.status;
  return redemptionStatus === "released" || redemptionStatus === "cancelled"
    ? { kind: "free" }
    : { kind: "existing-order", order: status.order };
};

/** Khóa idempotency (UUID v4) cho một lần bán vé có voucher giấy. */
export const createPaperVoucherRequestId = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : formatUuidV4(crypto.getRandomValues(new Uint8Array(16)));
