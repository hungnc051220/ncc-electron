import {
  getApiErrorCode,
  getApiErrorDetails,
  getApiErrorMessage,
  getApiErrorStatus,
  isRetryableApiError
} from "@renderer/lib/apiError";
import { formatMoney, formatPaymentMethod, resolvePaymentType } from "@renderer/lib/utils";
import {
  PaymentType,
  type OrderDetailProps,
  type OrderResponseProps,
  type PaperVoucherOrderQuote,
  type PaperVoucherRequestStatus,
  type QrDialogData
} from "@shared/types";

/**
 * Voucher giấy là một nguồn thanh toán (tương đương tiền mặt), không phải giảm giá: tổng đơn giữ
 * nguyên, voucher trả một phần, phần còn lại trả bằng tiền mặt (`POS`), VietQR hoặc VNPayQR khi
 * backend cho phép (`allowedPaymentMethods` của báo giá).
 *
 * Báo giá không phụ thuộc phương thức thanh toán nên luôn gửi `POS`; đổi phương thức không báo giá lại.
 */
export const PAPER_VOUCHER_CASH_METHOD: string = PaymentType.POS;

export const PAPER_VOUCHER_PAYMENT_HINT =
  "Đơn có voucher giấy: phần còn lại trả bằng tiền mặt, VietQR hoặc VNPayQR khi hệ thống cho phép.";
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

/** `code` lỗi của các thao tác QR trên đơn có voucher giấy (tạo QR, đóng QR, chuyển thành công). */
export const PAPER_VOUCHER_QR_ERROR_CODES = {
  orderLocked: "PAPER_VOUCHER_ORDER_LOCKED",
  qrPaymentReceived: "PAPER_VOUCHER_QR_PAYMENT_RECEIVED",
  qrPaymentNotConfirmed: "PAPER_VOUCHER_QR_PAYMENT_NOT_CONFIRMED",
  qrCreationInProgress: "PAPER_VOUCHER_QR_CREATION_IN_PROGRESS",
  requestGuardUnavailable: "PAPER_VOUCHER_REQUEST_GUARD_UNAVAILABLE",
  qrTransactionNotReusable: "PAPER_VOUCHER_QR_TRANSACTION_NOT_REUSABLE"
} as const;

/**
 * Lỗi `create-qr` của đơn có voucher giấy (đơn đã tạo, voucher đang giữ). Không loại nào tự kết thúc
 * đơn hay trả voucher: chỉ thu ngân bấm "Kết thúc" (backend xác nhận) mới đóng đơn.
 * - `in-progress`: 409, một lần tạo QR khác của đơn đang chạy; thử lại sẽ dùng lại QR đó.
 * - `guard-unavailable`: 503, backend chưa ghi gì (không giữ được khóa tạo QR); thử lại sau.
 * - `outcome-unknown`: mất mạng/timeout/5xx khác: QR có thể đã được tạo ở backend; thử lại cùng đơn
 *   (backend trả lại QR đang chờ, không tạo QR thứ hai).
 * - `not-reusable`: 409, giao dịch QR của đơn đã được thanh toán hoặc đã đóng: tra lại đơn.
 * - `rejected`: backend từ chối (4xx khác), không có QR; tra lại đơn, giữ đơn chờ thu ngân quyết định.
 */
export type PaperVoucherQrCreateFailure =
  | { kind: "in-progress"; message: string }
  | { kind: "guard-unavailable"; message: string }
  | { kind: "outcome-unknown"; message: string }
  | { kind: "not-reusable"; message: string }
  | { kind: "rejected"; message: string };

export const PAPER_VOUCHER_QR_CREATE_IN_PROGRESS_MESSAGE =
  "QR của đơn đang được tạo ở máy chủ. Bấm Tạo lại QR sau vài giây, không bán lại.";
export const PAPER_VOUCHER_QR_GUARD_UNAVAILABLE_MESSAGE =
  "Máy chủ tạm thời chưa tạo được QR. Đơn và voucher giấy vẫn được giữ; bấm Tạo lại QR sau vài giây.";
export const PAPER_VOUCHER_QR_OUTCOME_UNKNOWN_MESSAGE =
  "Không nhận được phản hồi khi tạo QR (QR có thể đã được tạo). Đơn và voucher giấy vẫn được giữ; bấm Tạo lại QR để lấy lại QR của đơn, không bán lại.";

/** Thời gian chờ giữa các lần tự tạo lại QR (backoff); hết lượt thì chờ thu ngân bấm Tạo lại QR. */
export const PAPER_VOUCHER_QR_RETRY_DELAYS_MS: readonly number[] = [1000, 2000, 4000];

export const classifyPaperVoucherQrCreateError = (error: unknown): PaperVoucherQrCreateFailure => {
  const code = getApiErrorCode(error);

  if (code === PAPER_VOUCHER_QR_ERROR_CODES.qrCreationInProgress) {
    return { kind: "in-progress", message: PAPER_VOUCHER_QR_CREATE_IN_PROGRESS_MESSAGE };
  }
  if (code === PAPER_VOUCHER_QR_ERROR_CODES.requestGuardUnavailable) {
    return { kind: "guard-unavailable", message: PAPER_VOUCHER_QR_GUARD_UNAVAILABLE_MESSAGE };
  }
  if (code === PAPER_VOUCHER_QR_ERROR_CODES.qrTransactionNotReusable) {
    return {
      kind: "not-reusable",
      message: getApiErrorMessage(error, "Giao dịch QR của đơn không dùng lại được")
    };
  }
  if (isRetryableApiError(error)) {
    return { kind: "outcome-unknown", message: PAPER_VOUCHER_QR_OUTCOME_UNKNOWN_MESSAGE };
  }
  return { kind: "rejected", message: getApiErrorMessage(error, "Tạo QR thất bại") };
};

/** Lỗi tạm thời: được tự tạo lại QR (cùng đơn, tuần tự, có giới hạn). */
export const isPaperVoucherQrCreateRetryable = (failure: PaperVoucherQrCreateFailure) =>
  failure.kind === "in-progress" ||
  failure.kind === "guard-unavailable" ||
  failure.kind === "outcome-unknown";

export type PaperVoucherQrCreateResult<T> =
  | { ok: true; qr: T }
  | { ok: false; failure: PaperVoucherQrCreateFailure };

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Tạo QR cho một đơn có voucher giấy, tự thử lại lỗi tạm thời theo `delays` (mỗi phần tử là một lần
 * thử lại). Các lần gọi tuần tự, không bao giờ hai request tạo QR cùng lúc; luôn cùng `orderId` nên
 * backend dùng lại giao dịch QR đang chờ thay vì tạo đơn/QR mới. `shouldStop`: dừng (màn hình đã đóng).
 */
export const createPaperVoucherQrWithRetry = async <T>(
  create: () => Promise<T>,
  {
    delays = PAPER_VOUCHER_QR_RETRY_DELAYS_MS,
    shouldStop,
    onRetry,
    wait = sleep
  }: {
    delays?: readonly number[];
    shouldStop?: () => boolean;
    onRetry?: (retry: number, failure: PaperVoucherQrCreateFailure) => void;
    wait?: (ms: number) => Promise<void>;
  } = {}
): Promise<PaperVoucherQrCreateResult<T>> => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return { ok: true, qr: await create() };
    } catch (error: unknown) {
      const failure = classifyPaperVoucherQrCreateError(error);
      const canRetry =
        isPaperVoucherQrCreateRetryable(failure) && attempt < delays.length && !shouldStop?.();
      if (!canRetry) return { ok: false, failure };
      onRetry?.(attempt + 1, failure);
      await wait(delays[attempt]);
      if (shouldStop?.()) return { ok: false, failure };
    }
  }
};

/**
 * Trạng thái thanh toán QR của đơn có voucher giấy theo dữ liệu backend. Không suy ra "đã thanh toán"
 * chỉ vì giao dịch QR có `success` (QR trả thiếu, thanh toán đến muộn sau khi đơn đã kết thúc):
 * - `paid`: voucher đã áp dụng, đơn hoàn tất; được in vé.
 * - `received`: nhà cung cấp đã báo thành công nhưng đơn còn chờ (xác nhận lỗi): backend kiểm số tiền
 *   khi chuyển đơn sang thành công.
 * - `waiting`: chưa nhận thanh toán.
 * - `released` / `cancelled`: đơn đã kết thúc / đã hủy, voucher không được dùng; không in vé.
 */
export type PaperVoucherQrState = "paid" | "received" | "waiting" | "released" | "cancelled";

const getSuccessfulQrTransactions = (
  order?: Pick<OrderResponseProps, "orderPaymentTransactions">
) =>
  (order?.orderPaymentTransactions ?? []).filter(
    (transaction) => transaction.status?.trim().toLowerCase() === "success"
  );

const hasSuccessfulQrTransaction = (order?: Pick<OrderResponseProps, "orderPaymentTransactions">) =>
  getSuccessfulQrTransactions(order).length > 0;

/** Tổng số tiền các giao dịch QR backend đã ghi `success` (số liệu của backend, không suy đoán). */
const getSuccessfulQrAmount = (order?: Pick<OrderResponseProps, "orderPaymentTransactions">) =>
  getSuccessfulQrTransactions(order).reduce(
    (total, transaction) => total + (Number(transaction.transactionAmount) || 0),
    0
  );

export const resolvePaperVoucherQrState = (
  detail: Pick<OrderDetailProps, "order" | "paperVoucher">
): PaperVoucherQrState => {
  const status = detail.paperVoucher?.status;
  if (status === "applied") return "paid";
  if (status === "released") return "released";
  if (status === "cancelled") return "cancelled";
  return hasSuccessfulQrTransaction(detail.order) ? "received" : "waiting";
};

export const PAPER_VOUCHER_QR_WAITING_MESSAGE =
  "Chưa nhận được thanh toán QR. Voucher giấy vẫn đang được giữ cho đơn này; kiểm tra lại sau.";
export const PAPER_VOUCHER_QR_CLOSE_FAILED_MESSAGE =
  "Chưa kết thúc được QR. Đơn và voucher giấy chưa đổi; kiểm tra lại giao dịch trước khi bán lại.";
/** Không nhận được phản hồi khi "Kết thúc": backend có thể đã đóng đơn hoặc chưa; bấm lại an toàn. */
export const PAPER_VOUCHER_QR_CLOSE_UNKNOWN_MESSAGE =
  "Không nhận được phản hồi khi kết thúc QR, chưa rõ đơn đã được kết thúc hay chưa. Không in vé. Bấm Kiểm tra lại giao dịch hoặc Kết thúc lần nữa; không bán lại.";

/** Đơn QR có voucher giấy đã kết thúc/hủy: không in vé, không báo voucher đã dùng. */
export const getPaperVoucherQrClosedMessage = (
  orderId: number,
  state: "released" | "cancelled",
  detail?: Pick<OrderDetailProps, "order">
) => {
  const outcome =
    state === "cancelled"
      ? `Đơn #${orderId} đã bị hủy`
      : `Đơn #${orderId} đã kết thúc, voucher giấy đã được trả lại`;
  const lateMoney = hasSuccessfulQrTransaction(detail?.order)
    ? ` Có giao dịch QR được ghi nhận${formatReceivedAmount(detail?.order)} (thiếu tiền hoặc đến muộn): báo quản lý đối soát, không tự hoàn tiền.`
    : "";
  return `${outcome}. Không in vé.${lateMoney}`;
};

const formatReceivedAmount = (order?: Pick<OrderResponseProps, "orderPaymentTransactions">) => {
  const amount = getSuccessfulQrAmount(order);
  return amount > 0 ? ` ${formatMoney(amount)}` : "";
};

/**
 * Đơn đã kết thúc/hủy nhưng backend có giao dịch QR `success` (tiền đến muộn sau khi đóng QR, trả thiếu
 * rồi đơn bị kết thúc): thu ngân phải báo quản lý đối soát. Không coi là đã thu tiền, không hứa hoàn.
 */
export const needsPaperVoucherQrReconciliation = (
  detail: Pick<OrderDetailProps, "order" | "paperVoucher">
) => {
  const state = resolvePaperVoucherQrState(detail);
  return (
    (state === "released" || state === "cancelled") && hasSuccessfulQrTransaction(detail.order)
  );
};

export const PAPER_VOUCHER_QR_RECONCILIATION_TITLE = "Cần đối soát thanh toán QR";

/**
 * Nhà cung cấp đã báo thành công nhưng backend không xác nhận đủ số tiền còn lại
 * (`QR_PAYMENT_NOT_CONFIRMED`): khách có thể đã trả thiếu. Đơn chưa hoàn tất, voucher vẫn giữ.
 */
export const getPaperVoucherQrShortPaymentMessage = (
  orderId: number,
  detail?: Pick<OrderDetailProps, "order" | "paperVoucher">
) => {
  const received = formatReceivedAmount(detail?.order);
  const expected = detail?.paperVoucher
    ? `, cần thu ${formatMoney(detail.paperVoucher.remainingPayable)}`
    : "";
  return `Đơn #${orderId}: có giao dịch QR được ghi nhận${received} nhưng máy chủ chưa xác nhận đủ số tiền còn lại${expected} (khách có thể đã trả thiếu). Đơn chưa hoàn tất, voucher giấy vẫn đang giữ. Không in vé. Báo quản lý đối soát, không tự hoàn tiền cho khách.`;
};

/** Không đọc được trạng thái đơn từ backend: không in vé, không trả voucher, không báo đã thu. */
export const getPaperVoucherQrUnknownStateMessage = (orderId: number) =>
  `Chưa xác định được trạng thái thanh toán của đơn #${orderId} (không kết nối được máy chủ). Không in vé, voucher giấy chưa thay đổi. Kiểm tra lại sau; nếu khách đã chuyển tiền, báo quản lý đối soát.`;

/** Thanh toán QR của đơn có voucher giấy xong: số tiền QR đã thu, voucher và các lô đã dùng. */
export const getPaperVoucherQrPaidMessage = (
  paperVoucher: QrDialogData["paperVoucher"],
  paymentMethodSystemName?: string
) => {
  if (!paperVoucher) return "Thanh toán thành công!";
  const qrName =
    resolvePaymentType(paymentMethodSystemName) === PaymentType.VNPAY ? "VNPayQR" : "VietQR";
  const lines = (paperVoucher.lines ?? [])
    .map((line) => `${line.batchCode} ×${line.quantity}`)
    .join(", ");
  const voucher = `Voucher giấy ${formatMoney(paperVoucher.voucherApplied)}${lines ? ` (${lines})` : ""}`;
  return `Thanh toán ${qrName} thành công ${formatMoney(paperVoucher.remainingPayable)}. ${voucher}.`;
};

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
 * Phương thức thanh toán phần còn lại có dùng được với voucher giấy không: chỉ theo `allowedPaymentMethods`
 * backend trả về (VietQR/VNPayQR khi còn tiền phải thu). Chưa có báo giá (`allowedMethods` trống) thì chưa
 * loại phương thức nào, báo giá về sẽ kiểm lại và lúc bán luôn kiểm theo báo giá đã xác nhận.
 */
export const isPaperVoucherPaymentMethodAllowed = (
  paymentMethod: string,
  allowedMethods?: readonly string[]
) => !allowedMethods || allowedMethods.includes(paymentMethod);

/**
 * "Kiểm tra lại giao dịch" có hỏi được nhà cung cấp không: `check-transaction` chỉ hỏi VietQR. Đơn
 * VNPayQR có voucher giấy đọc thẳng trạng thái đơn ở backend (do IPN VNPay xác nhận).
 */
export const canRecheckQrTransactionWithProvider = (paymentMethodSystemName?: string) =>
  resolvePaymentType(paymentMethodSystemName) !== PaymentType.VNPAY;

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
