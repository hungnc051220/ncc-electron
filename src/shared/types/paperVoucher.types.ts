/**
 * Lô voucher giấy của NCC. Voucher giấy không có mã/QR riêng từng tờ: chỉ quản lý theo lô
 * (mệnh giá + hạn sử dụng + số lượng phát hành).
 *
 * Ngày `validFrom`/`expiresAt` là ngày lịch theo giờ Việt Nam, định dạng `YYYY-MM-DD`.
 * `expiresAt` còn hiệu lực đến hết ngày đó; để trống nghĩa là voucher không có thời hạn.
 */
export interface PaperVoucherBatch {
  id: number;
  batchCode: string;
  name: string;
  faceValue: number;
  totalQuantity: number;
  usedCount: number;
  validFrom?: string | null;
  expiresAt?: string | null;
  isLocked: boolean;
  note?: string | null;
  /** Ảnh của lô theo thứ tự hiển thị (không phân biệt mặt trước/sau); `[]` khi chưa có ảnh. */
  images?: PaperVoucherImage[];
  createdAt: string;
  updatedAt: string;
  /** Các field dưới chỉ API thật trả về; FE vẫn tự tính trạng thái/số còn lại theo ngày VN. */
  remainingQuantity?: number;
  status?: PaperVoucherBatchStatus;
  createdBy?: string | null;
  updatedBy?: string | null;
  lockedAt?: string | null;
  lockedBy?: string | null;
}

export type PaperVoucherBatchStatus = "active" | "upcoming" | "expired" | "locked" | "depleted";

/** Ảnh voucher đã lưu; API trả URL file đã upload. */
export interface PaperVoucherImage {
  url: string;
  fileName?: string | null;
}

/** Kết quả `POST /images`; gửi nguyên object này trong body tạo/sửa lô. */
export interface PaperVoucherImageUpload {
  url: string;
  fileName: string | null;
}

/** Một ảnh trong form tạo/sửa lô: ảnh đã lưu hoặc file mới chọn (chưa upload). */
export type PaperVoucherImageDraft = PaperVoucherImage | { file: File };

export interface PaperVoucherBatchDto {
  name: string;
  faceValue: number;
  totalQuantity: number;
  validFrom?: string | null;
  expiresAt?: string | null;
  note?: string | null;
  /**
   * Danh sách ảnh theo thứ tự hiển thị. Bỏ trống (`undefined`) = giữ nguyên ảnh hiện có,
   * `[]` = xóa hết ảnh, mảng = thay toàn bộ danh sách (file mới được upload trước khi lưu).
   */
  images?: PaperVoucherImageDraft[];
}

export interface UpdatePaperVoucherBatchDto {
  id: number;
  dto: PaperVoucherBatchDto;
}

/** Một dòng voucher giấy áp dụng cho đơn: lô, số phiếu và mệnh giá nhân viên đã đối chiếu. */
export interface PaperVoucherRedemptionLine {
  batchId: number;
  quantity: number;
  faceValue: number;
}

/** Một dòng voucher giấy trong báo giá/đơn bán vé: số tiền do backend phân bổ. */
export interface PaperVoucherQuoteLine extends PaperVoucherRedemptionLine {
  batchCode: string;
  faceValueTotal: number;
  appliedAmount: number;
  /** Phần mệnh giá vượt giá trị đơn: không hoàn lại. */
  excessAmount: number;
}

/** `code` của cảnh báo báo giá, vd. `PAPER_VOUCHER_EXCESS`, `PAPER_VOUCHER_FULLY_PAID`. */
export interface PaperVoucherQuoteWarning {
  code: string;
  message: string;
}

/**
 * Kết quả `POST /api/pos/order/quote` (và `details.quote` của lỗi 409 `QUOTE_CHANGED`).
 * FE chỉ hiển thị, không tự tính lại số tiền.
 *
 * Voucher giấy là một nguồn thanh toán (tương đương tiền mặt), không phải giảm giá: tổng đơn, giá
 * vé, doanh thu giữ nguyên; voucher trả `voucherApplied`, khách trả thêm `remainingPayable`.
 * Bất biến: `orderTotal = voucherApplied + remainingPayable`,
 * `faceValueTotal = voucherApplied + excessAmount`.
 */
export interface PaperVoucherOrderQuote {
  businessDate: string;
  /** Tổng đơn sau mọi khuyến mãi; voucher giấy không làm thay đổi. */
  orderTotal: number;
  /** Chỉ gồm khuyến mãi hiện có (không gồm voucher giấy). */
  orderDiscount: number;
  voucherQuantity: number;
  faceValueTotal: number;
  /** Phần đơn trả bằng voucher giấy = min(orderTotal, faceValueTotal). */
  voucherApplied: number;
  /** Khách cần thanh toán thêm (tiền mặt hoặc VietQR). */
  remainingPayable: number;
  /** Phần mệnh giá vượt giá trị đơn: không hoàn lại. */
  excessAmount: number;
  lines: PaperVoucherQuoteLine[];
  /** Phương thức trả phần còn lại: `POS` (tiền mặt), có thể thêm `Payments.VietQR`. */
  allowedPaymentMethods: string[];
  warnings: PaperVoucherQuoteWarning[];
  quoteHash: string;
}

/** Trạng thái ghi nhận voucher của đơn: `held` = đang giữ chờ thanh toán QR. */
export type PaperVoucherRedemptionStatus = "held" | "applied" | "released" | "cancelled";

/** `paperVoucher` trong response tạo đơn có dùng voucher giấy (`orderTotal` của đơn không đổi). */
export interface OrderPaperVoucherResult {
  redemptionId: number;
  requestId: string;
  status: PaperVoucherRedemptionStatus;
  /** Phương thức trả phần còn lại (`POS` hoặc `Payments.VietQR`). */
  paymentMethodSystemName: string;
  orderTotal: number;
  voucherQuantity: number;
  faceValueTotal: number;
  voucherApplied: number;
  remainingPayable: number;
  excessAmount: number;
  /** Tiền khách đã trả thêm; `null` khi chưa thu (đơn QR đang chờ thanh toán). */
  collectedAmount: number | null;
  /** `true` khi backend trả lại đơn đã tạo ở lần gửi trước cùng `paperVoucherRequestId`. */
  replayed: boolean;
}

/**
 * Trạng thái từng lô voucher của đơn: `applied` = đang tính vào số đã dùng của lô,
 * `reversed` = đã trả tờ về lô (QR chưa thanh toán), `cancelled` = đơn đã hủy (tờ vô hiệu, không trả về lô).
 */
export type OrderPaperVoucherLineStatus = "applied" | "reversed" | "cancelled";

/** Một lô voucher giấy đã dùng cho đơn (một dòng mỗi lô). */
export interface OrderPaperVoucherDetailLine {
  batchId: number;
  batchCode: string;
  batchName: string | null;
  quantity: number;
  /** Mệnh giá ghi nhận lúc bán. */
  faceValue: number;
  faceValueTotal: number;
  /** Phần tiền đơn được trả bằng lô này. */
  appliedAmount: number;
  /** Phần mệnh giá của lô vượt giá trị đơn: không hoàn lại. */
  excessAmount: number;
  status: OrderPaperVoucherLineStatus;
}

/**
 * `paperVoucher` trong `GET /api/pos/order/:id`; `null` với đơn không dùng voucher giấy.
 * `order.orderTotal` vẫn là tổng tiền vé trước voucher (voucher là nguồn thanh toán, không phải giảm giá).
 */
export interface OrderPaperVoucherDetail {
  redemptionId: number;
  requestId: string;
  status: PaperVoucherRedemptionStatus;
  /** Phương thức trả phần còn lại (`POS` hoặc `Payments.VietQR`). */
  paymentMethodSystemName: string;
  orderTotal: number;
  voucherQuantity: number;
  faceValueTotal: number;
  voucherApplied: number;
  remainingPayable: number;
  excessAmount: number;
  /** Tiền khách đã trả thêm; `null` khi chưa thu (QR đang chờ hoặc chưa từng thanh toán). */
  collectedAmount: number | null;
  appliedAt: string | null;
  reversedAt: string | null;
  reversedBy: string | null;
  reversalSource: string | null;
  reversalReason: string | null;
  lines: OrderPaperVoucherDetailLine[];
}

/** `paperVoucher` trong response `create-qr` của đơn có voucher giấy. */
export interface QrPaperVoucherAmounts {
  orderTotal: number;
  voucherApplied: number;
  remainingPayable: number;
}

export type PaperVoucherUsageStatus = "applied" | "reversed";

export interface PaperVoucherUsage {
  id: number;
  transactionId: string | null;
  batchId: number;
  batchCode: string;
  quantity: number;
  faceValue: number;
  appliedAmount: number;
  staffName?: string | null;
  createdAt: string;
  status: PaperVoucherUsageStatus;
  orderId?: number | null;
  posShortName?: string | null;
  reversedAt?: string | null;
  reversedBy?: string | null;
  reversalReason?: string | null;
}

export interface SetPaperVoucherBatchLockedDto {
  id: number;
  isLocked: boolean;
}

export type PaperVoucherSortField =
  | "batchCode"
  | "name"
  | "faceValue"
  | "totalQuantity"
  | "usedCount"
  | "remainingQuantity"
  | "validFrom"
  | "expiresAt";

/** Bộ lọc dùng chung cho danh sách lô và thống kê (`GET /batches`, `GET /summary`). */
export interface PaperVoucherBatchFilterQuery {
  keyword?: string;
  faceValue?: number;
  status?: PaperVoucherBatchStatus;
  /** Khoảng HSD `YYYY-MM-DD`, bao gồm hai đầu; lô không thời hạn bị loại khi có khoảng. */
  expiresFrom?: string;
  expiresTo?: string;
  /** `true` = chỉ lô không thời hạn. */
  noExpiry?: boolean;
}

export interface PaperVoucherBatchQuery extends PaperVoucherBatchFilterQuery {
  current: number;
  /** `0` = trả toàn bộ. */
  pageSize: number;
  /** `field.asc|desc`; bỏ trống = mặc định backend `id.desc` (lô mới nhất trước). */
  sort?: string;
}

export interface PaperVoucherSummary {
  totalBatches: number;
  totalQuantity: number;
  usedCount: number;
  remainingQuantity: number;
  totalFaceValue: number;
  usedFaceValue: number;
  remainingFaceValue: number;
  countByStatus: Record<PaperVoucherBatchStatus, number>;
  /** Ngày nghiệp vụ VN backend dùng để tính trạng thái. */
  businessDate: string;
}
