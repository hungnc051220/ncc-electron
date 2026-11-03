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

/** Tổng hợp voucher giấy của một đơn, do backend tính sau mọi khuyến mãi hiện có. */
export interface PaperVoucherOrderBreakdown {
  lines: PaperVoucherQuoteLine[];
  voucherQuantity: number;
  faceValueTotal: number;
  voucherApplied: number;
  excessAmount: number;
}

export interface PaperVoucherQuoteWarning {
  code: string;
  message: string;
}

/** Kết quả `POST /api/pos/order/quote`. FE chỉ hiển thị, không tự tính lại số tiền. */
export interface PaperVoucherOrderQuote {
  businessDate: string;
  /** Tổng đơn sau các khuyến mãi hiện có, trước voucher giấy. */
  baseTotal: number;
  /** Chỉ gồm khuyến mãi hiện có (không gồm voucher giấy). */
  orderDiscount: number;
  /** Số tiền khách cần trả (tiền mặt). */
  finalOrderTotal: number;
  paperVoucher: PaperVoucherOrderBreakdown;
  allowedPaymentMethods: string[];
  warnings: PaperVoucherQuoteWarning[];
  quoteHash: string;
}

/** `paperVoucher` trong response tạo đơn có dùng voucher giấy. */
export interface OrderPaperVoucherResult {
  redemptionId: number;
  requestId: string;
  baseTotal: number;
  voucherQuantity: number;
  faceValueTotal: number;
  voucherApplied: number;
  finalOrderTotal: number;
  excessAmount: number;
  /** `true` khi backend trả lại đơn đã tạo ở lần gửi trước cùng `paperVoucherRequestId`. */
  replayed: boolean;
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
