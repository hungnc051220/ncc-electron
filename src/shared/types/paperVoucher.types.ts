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

/** Ảnh voucher đã lưu. Mock dùng object URL trong phiên; API thật trả URL file đã upload. */
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

/** Giao dịch sử dụng voucher giấy mô phỏng; không gắn với đơn hàng thật. */
export interface SimulatePaperVoucherRedemptionDto {
  transactionId: string;
  lines: PaperVoucherRedemptionLine[];
  ticketCount: number;
  eligibleAmount: number;
  staffName?: string | null;
}

/** `simulated` chỉ có ở mock; API thật trả `applied`/`reversed`. */
export type PaperVoucherUsageStatus = "simulated" | "applied" | "reversed";

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
