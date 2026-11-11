// Giá khi thêm ca chiếu (V3.2): lý do giá theo cấu hình từng ngày, lỗi tra giá rõ ràng (không bao giờ dùng 0đ),
// trạng thái sẵn sàng lưu, và xử lý 409 `PRICING_STALE`.
import {
  getApiErrorCode,
  getApiErrorDetails,
  getSafeApiErrorMessage
} from "@renderer/lib/apiError";
import { formatNumber } from "@renderer/lib/utils";
import type { PlanPricingProps, PlanScreeningPriceMode, PricingStaleDetails } from "@shared/types";

const BASE_TYPE_LABELS: Record<number, string> = { 1: "Ngày thường", 2: "Cuối tuần" };

/**
 * Dòng lý do giá từ plan-pricing (contract V3.2 mục 3), vd. "Ngày lễ: Ngày văn hóa — áp dụng giá ngày lễ · Khung:
 * …" hoặc "Ngày lễ: Phụ nữ Việt Nam — theo giá ngày thường · …". Backend cũ (không có `pricingReason`) → `null`:
 * không khẳng định điều backend chưa xác nhận.
 */
export const getPlanPricingReason = (pricing?: PlanPricingProps | null): string | null => {
  if (!pricing?.pricingReason) return null;
  const baseLabel = BASE_TYPE_LABELS[pricing.baseDateTypeId ?? 0] ?? "Phân loại gốc";
  const slot = pricing.dayPartName ? ` · Khung: ${pricing.dayPartName}` : "";
  const holidayName = pricing.holidayName?.trim() ? `: ${pricing.holidayName.trim()}` : "";
  const blocked = pricing.isHoliday || pricing.isPromotionExcluded ? " · Không áp U22" : "";
  if (pricing.pricingReason === "HOLIDAY") {
    return `Ngày lễ${holidayName} — áp dụng giá ngày lễ${slot}${blocked}`;
  }
  if (pricing.isHoliday) {
    return `Ngày lễ${holidayName} — theo giá ${baseLabel.toLowerCase()}${slot}${blocked}`;
  }
  return `${baseLabel} — giá theo phân loại ngày${slot}${blocked}`;
};

/** Thông báo cho các lỗi tra giá nghiệp vụ (400/503 của plan-pricing); không fallback giá 0đ. */
const PLAN_PRICING_ERROR_MESSAGES: Record<string, string> = {
  PRICING_DAY_PART_AMBIGUOUS:
    "Có nhiều khung giờ cùng chứa giờ chiếu này. Cần sửa cấu hình khung giờ trước khi lập suất.",
  PRICING_DAY_PART_NOT_CONFIGURED: "Chưa có khung giờ nào chứa giờ chiếu này.",
  PRICING_DATE_NOT_CONFIGURED: "Ngày chiếu chưa có trong Danh sách ngày.",
  PRICE_NOT_CONFIGURED: "Phòng/phiên bản này chưa có giá vé cho khung giờ đã chọn.",
  PRICING_TIME_INVALID: "Giờ chiếu không hợp lệ.",
  HOLIDAY_PRICE_MODE_UNAVAILABLE:
    "Không đọc được giá vé áp dụng của ngày lễ này (cơ sở dữ liệu chưa được cập nhật cấu trúc V3.2 hoặc lỗi đọc)."
};

/** Thông báo lỗi khi tra giá cho ca chiếu: ưu tiên mã nghiệp vụ, kèm "chưa thể lưu ca chiếu". */
export const getPlanPricingErrorMessage = (error: unknown) => {
  const code = getApiErrorCode(error);
  const known = code ? PLAN_PRICING_ERROR_MESSAGES[code] : undefined;
  return known
    ? `${known} Chưa thể lưu ca chiếu.`
    : getSafeApiErrorMessage(error, "Lấy giá vé theo kế hoạch thất bại");
};

/** Có được phép lưu theo giá đang hiển thị không (không lưu giá đang tải, giá cũ giữ chỗ, giá lỗi). */
export const isPlanPricingReady = ({
  isQueryEnabled,
  isFetching,
  isPlaceholderData,
  isError,
  hasPricing
}: {
  isQueryEnabled: boolean;
  isFetching: boolean;
  isPlaceholderData: boolean;
  isError: boolean;
  hasPricing: boolean;
}) => isQueryEnabled && !isFetching && !isPlaceholderData && !isError && hasPricing;

/** Lý do chặn nút Lưu, để hiển thị cho người dùng; `null` khi đã sẵn sàng. */
export const getPricingBlockReason = (state: {
  isQueryEnabled: boolean;
  isFetching: boolean;
  isPlaceholderData: boolean;
  isError: boolean;
  hasPricing: boolean;
  /** Thông báo lỗi tra giá cụ thể (vd. khung giờ trùng nhau); thiếu thì dùng câu chung. */
  errorMessage?: string | null;
}): string | null => {
  if (!state.isQueryEnabled) return "Chọn phim, giờ chiếu, ngày chiếu và phòng để tải giá vé.";
  if (state.isFetching || state.isPlaceholderData) return "Đang tải giá vé…";
  if (state.isError) return state.errorMessage || "Chưa lấy được giá vé, chưa thể lưu ca chiếu.";
  if (!state.hasPricing) return "Phòng/phiên bản này chưa có giá vé, chưa thể lưu ca chiếu.";
  return null;
};

type PriceFields = {
  priceOfPosition1?: number;
  priceOfPosition2?: number;
  priceOfPosition3?: number;
};
type ListPriceMap = Partial<
  Record<keyof PriceFields, { seatType: string; price: number } | undefined>
>;

/**
 * Nguồn giá gửi lên: Đồng giá → `UNIFORM` (chế độ giá, không suy ra từ giá bằng nhau); giữ `MANUAL` khi người
 * dùng đã sửa ô giá; ở `LIST` mà giá trong form khác giá bảng (phòng hờ) thì cũng gửi `MANUAL` để backend không
 * coi là lỗi giá cũ.
 */
export const resolvePriceMode = (
  mode: PlanScreeningPriceMode,
  values: PriceFields,
  listPrices: ListPriceMap,
  isUniform = false
): PlanScreeningPriceMode => {
  if (isUniform || mode === "UNIFORM") return "UNIFORM";
  if (mode === "MANUAL") return "MANUAL";
  const fields: (keyof PriceFields)[] = [
    "priceOfPosition1",
    "priceOfPosition2",
    "priceOfPosition3"
  ];
  const differs = fields.some((field) => {
    const list = listPrices[field];
    if (!list) return false;
    return Number(values[field]) !== list.price;
  });
  return differs ? "MANUAL" : "LIST";
};

/** `details` của 409 `PRICING_STALE`, hoặc `null` nếu lỗi khác. */
export const getPricingStaleDetails = (error: unknown): PricingStaleDetails | null => {
  if (getApiErrorCode(error) !== "PRICING_STALE") return null;
  const details = getApiErrorDetails(error);
  return details && typeof details === "object" ? (details as PricingStaleDetails) : {};
};

export type StaleComparisonRow = {
  seatType: string;
  requested: string;
  current: string;
  changed: boolean;
};

const parseCell = (value?: string) => {
  const [seatType, amount] = (value ?? "").split(":");
  return seatType && amount !== undefined ? { seatType, amount: Number(amount) } : null;
};

/** So sánh giá FE đã gửi với giá bảng hiện tại theo từng mã ghế. */
export const buildStaleComparisonRows = (
  requested: Pick<
    NonNullable<PricingStaleDetails["requested"]>,
    "priceOfPosition1" | "priceOfPosition2" | "priceOfPosition3" | "priceOfPosition4"
  >,
  current?: PlanPricingProps | null
): StaleComparisonRow[] => {
  const requestedCells = [
    requested.priceOfPosition1,
    requested.priceOfPosition2,
    requested.priceOfPosition3,
    requested.priceOfPosition4
  ]
    .map(parseCell)
    .filter((cell): cell is { seatType: string; amount: number } => cell !== null);
  const currentPricings = current?.pricings ?? {};
  const seatTypes = Array.from(
    new Set([...requestedCells.map((cell) => cell.seatType), ...Object.keys(currentPricings)])
  );
  return seatTypes.map((seatType) => {
    const requestedCell = requestedCells.find((cell) => cell.seatType === seatType);
    const currentPrice = currentPricings[seatType];
    const requestedText = requestedCell ? formatNumber(requestedCell.amount) : "—";
    const currentText = currentPrice !== undefined ? formatNumber(currentPrice) : "—";
    return {
      seatType,
      requested: requestedText,
      current: currentText,
      changed: requestedText !== currentText
    };
  });
};
