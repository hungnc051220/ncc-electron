// "Đối chiếu giá suất chiếu" (contract V3.2 mục 6, chỉ đọc): so sánh "Giá đang lưu" (snapshot đã dùng để bán) với
// "Giá theo cấu hình hiện tại", theo từng loại ghế. Chức năng điều chỉnh giá suất đang tạm ngừng nên không có thao
// tác ghi.
import { formatNumber } from "@renderer/lib/utils";
import type {
  PlanScreeningPriceSnapshot,
  RepricingPreviewItem,
  RepricingPreviewSummary,
  RepricingPriceSource
} from "@shared/types";
import dayjs from "dayjs";

const PRICE_FIELDS = [
  "priceOfPosition1",
  "priceOfPosition2",
  "priceOfPosition3",
  "priceOfPosition4"
] as const;

export type SeatPrice = { code: string; amount: number };

/** Giá theo loại ghế của một snapshot (`MÃ:giá` ở 4 vị trí); ô rỗng hoặc sai dạng bị bỏ qua. */
export const parseSeatPrices = (
  snapshot?: Partial<PlanScreeningPriceSnapshot> | null
): SeatPrice[] =>
  PRICE_FIELDS.flatMap((field) => {
    const text = (snapshot?.[field] ?? "").trim();
    const [code, amount] = text.split(":");
    const numeric = Number(amount);
    return code && amount !== undefined && amount.trim() !== "" && Number.isFinite(numeric)
      ? [{ code: code.trim(), amount: numeric }]
      : [];
  });

export const formatSeatPrice = ({ code, amount }: SeatPrice) => `${code} ${formatNumber(amount)}`;

export type SeatPriceDiff = { code: string; stored?: number; configured?: number };

/** Loại ghế có giá khác nhau giữa giá đang lưu và giá theo cấu hình (theo mã ghế). */
export const getSeatPriceDiffs = (
  stored: Partial<PlanScreeningPriceSnapshot>,
  configured?: Partial<PlanScreeningPriceSnapshot> | null
): SeatPriceDiff[] => {
  if (!configured) return [];
  const storedPrices = parseSeatPrices(stored);
  const configuredPrices = parseSeatPrices(configured);
  const codes = Array.from(
    new Set([...storedPrices, ...configuredPrices].map((price) => price.code))
  );
  return codes
    .map((code) => ({
      code,
      stored: storedPrices.find((price) => price.code === code)?.amount,
      configured: configuredPrices.find((price) => price.code === code)?.amount
    }))
    .filter((diff) => diff.stored !== diff.configured);
};

/** "T: +10,000" (cấu hình − đang lưu); thiếu một bên thì ghi rõ. */
export const formatSeatPriceDiff = ({ code, stored, configured }: SeatPriceDiff) => {
  if (stored === undefined) return `${code}: chỉ có trong cấu hình`;
  if (configured === undefined) return `${code}: không có trong cấu hình`;
  const delta = configured - stored;
  return `${code}: ${delta > 0 ? "+" : "−"}${formatNumber(Math.abs(delta))}`;
};

export const PRICE_SOURCE_LABELS: Record<RepricingPriceSource, string> = {
  LIST: "Giá bảng",
  MANUAL: "Giá nhập tay",
  UNIFORM: "Đồng giá",
  LEGACY_UNSPECIFIED: "Không rõ nguồn",
  MATCHES_STORED_LIST: "Giá bảng lúc lập",
  DIFFERS_UNKNOWN: "Khác bảng, không rõ nguồn",
  UNKNOWN: "Không rõ nguồn"
};

/** Giá do người lập chọn (Đồng giá, nhập tay, khác bảng): chênh lệch không có nghĩa là sai. */
export const isCustomPriceSource = (source: RepricingPriceSource) =>
  source === "UNIFORM" || source === "MANUAL" || source === "DIFFERS_UNKNOWN";

export type RepricingComparison =
  | { kind: "past"; label: string }
  | { kind: "unavailable"; label: string }
  | { kind: "same"; label: string }
  | { kind: "differs"; label: string };

/** Kết quả đối chiếu của một suất (chỉ thông tin, không có đề xuất ghi). */
export const getRepricingComparison = (item: RepricingPreviewItem): RepricingComparison => {
  if (item.isPast) return { kind: "past", label: "Đã bắt đầu" };
  if (!item.configured) return { kind: "unavailable", label: "Không tính được giá" };
  return item.differs
    ? { kind: "differs", label: "Có chênh lệch" }
    : { kind: "same", label: "Khớp" };
};

/** Đếm theo kết quả đối chiếu khi backend cũ không trả `summary` (backend trả toàn bộ suất). */
export const summarizeRepricing = (items: RepricingPreviewItem[]): RepricingPreviewSummary => ({
  total: items.length,
  matching: items.filter((item) => !item.isPast && item.configured && !item.differs).length,
  differing: items.filter((item) => item.differs).length,
  unavailable: items.filter((item) => !item.isPast && !item.configured).length,
  past: items.filter((item) => item.isPast).length
});

/**
 * Bộ lọc mặc định: suất có chênh lệch và suất không tính được giá (không coi là khớp). `showAll`: mọi suất.
 */
export const filterRepricingItems = (items: RepricingPreviewItem[], showAll: boolean) =>
  showAll ? items : items.filter((item) => item.differs || (!item.isPast && !item.configured));

/** "Thứ 3" / "Chủ nhật" của một ngày. */
export const formatWeekdayLabel = (value: dayjs.ConfigType) => {
  const weekday = dayjs(value).day();
  return weekday === 0 ? "Chủ nhật" : `Thứ ${weekday + 1}`;
};
