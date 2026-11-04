import type {
  PaperVoucherBatch,
  PaperVoucherBatchDto,
  PaperVoucherBatchFilterQuery,
  PaperVoucherBatchStatus,
  PaperVoucherUsageStatus
} from "@shared/types";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

export const PAPER_VOUCHER_TIMEZONE = "Asia/Ho_Chi_Minh";
export const PAPER_VOUCHER_DATE_FORMAT = "YYYY-MM-DD";
export const PAPER_VOUCHER_DISPLAY_DATE_FORMAT = "DD/MM/YYYY";

export type PaperVoucherStatus = PaperVoucherBatchStatus;

export const PAPER_VOUCHER_STATUS_META: Record<
  PaperVoucherStatus,
  { label: string; color: string }
> = {
  active: { label: "Đang áp dụng", color: "success" },
  upcoming: { label: "Chưa bắt đầu", color: "processing" },
  expired: { label: "Hết hạn", color: "default" },
  locked: { label: "Đã khóa", color: "error" },
  depleted: { label: "Hết số lượng khả dụng", color: "warning" }
};

export const PAPER_VOUCHER_STATUS_OPTIONS = (
  Object.keys(PAPER_VOUCHER_STATUS_META) as PaperVoucherStatus[]
).map((status) => ({ value: status, label: PAPER_VOUCHER_STATUS_META[status].label }));

/**
 * Trạng thái lượt sử dụng theo contract BE (`PaperVoucherUsage.Status`): 10 `applied`,
 * 20 `reversed` (QR chưa thanh toán, tờ trả lại lô), 30 `cancelled` (đơn hủy, tờ vô hiệu,
 * vẫn tính vào số đã dùng). Cùng nhãn với khối "Voucher giấy" ở chi tiết đơn.
 */
export const PAPER_VOUCHER_USAGE_STATUS_META: Record<
  PaperVoucherUsageStatus,
  { label: string; color: string }
> = {
  applied: { label: "Đã áp dụng", color: "success" },
  reversed: { label: "Đã trả lại lô", color: "default" },
  cancelled: { label: "Đã hủy, không dùng lại", color: "error" }
};

const isKnownUsageStatus = (status: string): status is PaperVoucherUsageStatus =>
  Object.prototype.hasOwnProperty.call(PAPER_VOUCHER_USAGE_STATUS_META, status);

/** Trạng thái BE trả mà FE chưa biết vẫn hiển thị (kèm mã gốc) thay vì làm hỏng bảng. */
export const getPaperVoucherUsageStatusMeta = (status?: string | null) => {
  if (status && isKnownUsageStatus(status)) return PAPER_VOUCHER_USAGE_STATUS_META[status];
  return { label: status ? `Không xác định (${status})` : "Không xác định", color: "warning" };
};

/** Ngày nghiệp vụ hiện tại theo giờ Việt Nam, dạng `YYYY-MM-DD`. */
export const getVietnamBusinessDate = (now?: dayjs.ConfigType) =>
  dayjs(now).tz(PAPER_VOUCHER_TIMEZONE).format(PAPER_VOUCHER_DATE_FORMAT);

export const formatPaperVoucherDate = (value?: string | null) =>
  value ? dayjs(value).format(PAPER_VOUCHER_DISPLAY_DATE_FORMAT) : "--";

export const isValidPaperVoucherDate = (value?: string | null): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  dayjs(value).format(PAPER_VOUCHER_DATE_FORMAT) === value;

export const PAPER_VOUCHER_NO_EXPIRY_LABEL = "Không thời hạn";
/** Giá trị bộ lọc HSD cho lô không có thời hạn. */
export const PAPER_VOUCHER_NO_EXPIRY_FILTER = "no-expiry";

/**
 * So sánh theo ngày thực tế. Ngày trống mặc định xếp trước khi sort tăng dần (ngày bắt đầu);
 * dùng `emptyAs: "max"` cho ngày hết hạn, vì không có thời hạn là xa nhất.
 */
export const comparePaperVoucherDate = (
  left?: string | null,
  right?: string | null,
  emptyAs: "min" | "max" = "min"
) => {
  const empty = emptyAs === "min" ? -Infinity : Infinity;
  return (left ? dayjs(left).valueOf() : empty) - (right ? dayjs(right).valueOf() : empty) || 0;
};

export const PAPER_VOUCHER_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const PAPER_VOUCHER_IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp";
export const PAPER_VOUCHER_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
/** Khớp giới hạn backend `PAPER_VOUCHER_MAX_IMAGES`. */
export const PAPER_VOUCHER_MAX_IMAGES = 10;
export const PAPER_VOUCHER_TOO_MANY_IMAGES_MESSAGE = `Mỗi lô tối đa ${PAPER_VOUCHER_MAX_IMAGES} ảnh`;

export const validatePaperVoucherImageFile = (file: Pick<File, "type" | "size">) => {
  if (!PAPER_VOUCHER_IMAGE_TYPES.includes(file.type)) return "Chỉ chấp nhận ảnh JPG, PNG hoặc WebP";
  if (file.size > PAPER_VOUCHER_IMAGE_MAX_SIZE) return "Ảnh phải có dung lượng tối đa 5 MB";
  return null;
};

/**
 * Trạng thái hiển thị luôn được tính từ ngày hiện tại (giờ VN), không lưu cứng.
 * Thứ tự ưu tiên: khóa > hết hạn > chưa bắt đầu > hết số lượng > đang áp dụng.
 * Ngày được so sánh dạng chuỗi `YYYY-MM-DD` nên HSD còn hiệu lực đến hết ngày;
 * lô không có `expiresAt` không bao giờ hết hạn.
 */
export const getPaperVoucherStatus = (
  batch: Pick<
    PaperVoucherBatch,
    "isLocked" | "validFrom" | "expiresAt" | "totalQuantity" | "usedCount"
  >,
  today: string = getVietnamBusinessDate()
): PaperVoucherStatus => {
  if (batch.isLocked) return "locked";
  if (batch.expiresAt && today > batch.expiresAt) return "expired";
  if (batch.validFrom && today < batch.validFrom) return "upcoming";
  if (batch.totalQuantity - batch.usedCount <= 0) return "depleted";
  return "active";
};

export const getPaperVoucherAmounts = (
  batch: Pick<PaperVoucherBatch, "faceValue" | "totalQuantity" | "usedCount">
) => {
  const remainingQuantity = Math.max(0, batch.totalQuantity - batch.usedCount);

  return {
    remainingQuantity,
    totalFaceValue: batch.faceValue * batch.totalQuantity,
    usedFaceValue: batch.faceValue * batch.usedCount,
    remainingFaceValue: batch.faceValue * remainingQuantity
  };
};

export const summarizePaperVoucherBatches = (batches: PaperVoucherBatch[]) =>
  batches.reduce(
    (acc, batch) => {
      const amounts = getPaperVoucherAmounts(batch);

      acc.totalBatches += 1;
      acc.totalQuantity += batch.totalQuantity;
      acc.usedCount += batch.usedCount;
      acc.remainingQuantity += amounts.remainingQuantity;
      acc.totalFaceValue += amounts.totalFaceValue;
      acc.usedFaceValue += amounts.usedFaceValue;
      acc.remainingFaceValue += amounts.remainingFaceValue;
      return acc;
    },
    {
      totalBatches: 0,
      totalQuantity: 0,
      usedCount: 0,
      remainingQuantity: 0,
      totalFaceValue: 0,
      usedFaceValue: 0,
      remainingFaceValue: 0
    }
  );

export type PaperVoucherAmountSummary = ReturnType<typeof summarizePaperVoucherBatches>;

export interface PaperVoucherFilterValues {
  keyword?: string;
  faceValue?: number;
  status?: PaperVoucherStatus;
  expiresAt?: string;
}

export const normalizeSearchText = (value?: string | null) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();

export const hasPaperVoucherFilters = (filters: PaperVoucherFilterValues) =>
  Boolean(
    normalizeSearchText(filters.keyword) ||
    filters.faceValue !== undefined ||
    filters.status ||
    filters.expiresAt
  );

/** Số bộ lọc đang áp dụng, hiển thị trên badge của nút "Bộ lọc". */
export const countPaperVoucherFilters = (filters: PaperVoucherFilterValues) =>
  [
    normalizeSearchText(filters.keyword),
    filters.faceValue !== undefined,
    filters.status,
    filters.expiresAt
  ].filter(Boolean).length;

/**
 * Chuyển bộ lọc trong popup "Bộ lọc" sang query API: một ngày HSD cụ thể = khoảng `[X, X]`,
 * lựa chọn "Không thời hạn" = `noExpiry=true`.
 */
export const toPaperVoucherBatchFilterQuery = (
  filters: PaperVoucherFilterValues
): PaperVoucherBatchFilterQuery => {
  const query: PaperVoucherBatchFilterQuery = {};
  const keyword = filters.keyword?.trim();

  if (keyword) query.keyword = keyword;
  if (filters.faceValue !== undefined) query.faceValue = filters.faceValue;
  if (filters.status) query.status = filters.status;
  if (filters.expiresAt === PAPER_VOUCHER_NO_EXPIRY_FILTER) {
    query.noExpiry = true;
  } else if (filters.expiresAt) {
    query.expiresFrom = filters.expiresAt;
    query.expiresTo = filters.expiresAt;
  }

  return query;
};

export const getDistinctSortedValues = <T extends string | number>(values: T[]) =>
  Array.from(new Set(values)).sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));

/**
 * Validate nghiệp vụ của form tạo/sửa lô.
 * Trả về thông báo lỗi tiếng Việt đầu tiên, hoặc `null` nếu hợp lệ.
 */
export const validatePaperVoucherBatchDto = (
  dto: PaperVoucherBatchDto,
  existing?: Pick<PaperVoucherBatch, "faceValue" | "usedCount" | "validFrom" | "expiresAt">
): string | null => {
  if (!dto.name?.trim()) return "Tên lô là bắt buộc";

  if (!Number.isInteger(dto.faceValue) || dto.faceValue <= 0) {
    return "Mệnh giá phải là số nguyên lớn hơn 0";
  }

  if (!Number.isInteger(dto.totalQuantity) || dto.totalQuantity <= 0) {
    return "Số lượng phải là số nguyên dương";
  }

  if (dto.expiresAt && !isValidPaperVoucherDate(dto.expiresAt)) {
    return "Ngày hết hạn không hợp lệ";
  }

  if (dto.validFrom) {
    if (!isValidPaperVoucherDate(dto.validFrom)) {
      return "Ngày bắt đầu không hợp lệ";
    }

    if (dto.expiresAt && dto.expiresAt < dto.validFrom) {
      return "Ngày hết hạn không được trước ngày bắt đầu";
    }
  }

  if (existing && dto.totalQuantity < existing.usedCount) {
    return `Số lượng không được nhỏ hơn số đã sử dụng (${existing.usedCount})`;
  }

  if (existing && existing.usedCount > 0) {
    if (dto.faceValue !== existing.faceValue) {
      return "Lô đã có lượt sử dụng, không thể thay đổi mệnh giá";
    }

    if (
      (dto.expiresAt || null) !== (existing.expiresAt || null) ||
      (dto.validFrom || null) !== (existing.validFrom || null)
    ) {
      return "Lô đã có lượt sử dụng, không thể thay đổi thời hạn áp dụng";
    }
  }

  const images = dto.images ?? [];
  if (images.length > PAPER_VOUCHER_MAX_IMAGES) return PAPER_VOUCHER_TOO_MANY_IMAGES_MESSAGE;

  for (const image of images) {
    const imageError = "file" in image ? validatePaperVoucherImageFile(image.file) : null;
    if (imageError) return imageError;
  }

  return null;
};
