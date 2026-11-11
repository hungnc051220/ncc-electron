/**
 * Giá vé theo cấu hình và chính sách U22 của một ngày trên màn Danh sách ngày (contract V3.2 mục 1). Không có
 * feature flag: quy tắc luôn áp dụng khi backend và DB có đủ cấu trúc.
 * - Phân loại gốc (`DateTypeId`): Ngày thường / Cuối tuần, không bao giờ bị đổi để ép giá.
 * - Giá vé: ngày lễ chọn "Giá ngày lễ" (`applyHolidayPrice = true`) dùng giá ngày lễ; ngày lễ chọn "Theo ngày
 *   trong tuần" và các ngày khác dùng nhóm giá của phân loại gốc. Đây là giá cấu hình cho các lần tra giá / lập
 *   suất mới; giá đang lưu của suất đã lập không tự đổi.
 * - Ưu đãi U22 (chính sách theo ngày): "Không áp dụng" khi ngày lễ (dù chọn giá nào) hoặc ngày tắt U22;
 *   "Có thể áp dụng" khi ngày được xét (áp dụng thực tế còn tùy khách hàng và suất chiếu); "Chưa xác định" khi
 *   chưa đọc được. Chỉ U22 bị chặn theo ngày; các ưu đãi khác không đổi.
 */
import type { HolidayProps, PricingRules } from "@shared/types";
import { DATE_TAB_LABELS, formatWeekday, getBaseTab } from "./dateClassification";

type DayFlags = Pick<
  HolidayProps,
  "dateTypeId" | "isHoliday" | "applyHolidayPrice" | "isPromotionExcluded"
>;

/** Backend V3.2 có đủ cấu trúc DB: cho phép các thao tác mới (giá vé áp dụng, không áp ưu đãi, U22 theo suất). */
export const isRulesReady = (rules?: PricingRules | null) => Boolean(rules?.ready);

/** "Ngày thường" / "Cuối tuần" theo `DateTypeId`, bỏ qua cờ lễ. */
export const getBaseTypeLabel = (day: Pick<HolidayProps, "dateTypeId">) =>
  DATE_TAB_LABELS[getBaseTab(day)];

export const HOLIDAY_PRICE_MODE_LABELS = {
  holiday: "Giá ngày lễ",
  weekday: "Theo ngày trong tuần"
} as const;

/** Nhãn chế độ giá của ngày lễ; `null` khi chưa biết (không đọc được hoặc backend cũ). */
export const getHolidayPriceModeLabel = (applyHolidayPrice?: boolean | null) => {
  if (applyHolidayPrice === true) return HOLIDAY_PRICE_MODE_LABELS.holiday;
  if (applyHolidayPrice === false) return HOLIDAY_PRICE_MODE_LABELS.weekday;
  return null;
};

export const PRICE_MODE_UNREADABLE_NOTE =
  "Không đọc được chế độ giá của ngày lễ. Máy chủ từ chối tra giá cho ngày này cho tới khi đọc được.";

export type TicketPriceGroup = {
  /** "Giá ngày lễ" / "Giá ngày thường" / "Giá cuối tuần"; `null` khi không xác định được (không đoán). */
  label: string | null;
  tone: "holiday" | "normal" | "weekend" | "unknown";
  note?: string;
};

/** Nhóm giá vé theo cấu hình: `isHoliday && applyHolidayPrice` → giá ngày lễ, còn lại theo phân loại gốc. */
export const getTicketPriceGroup = (day: DayFlags): TicketPriceGroup => {
  if (day.isHoliday && day.applyHolidayPrice === true) {
    return { label: "Giá ngày lễ", tone: "holiday" };
  }
  if (day.isHoliday && day.applyHolidayPrice !== false) {
    return { label: null, tone: "unknown", note: PRICE_MODE_UNREADABLE_NOTE };
  }
  return getBaseTab(day) === "weekend"
    ? { label: "Giá cuối tuần", tone: "weekend" }
    : { label: "Giá ngày thường", tone: "normal" };
};

/**
 * Preview trực tiếp của lựa chọn "Giá vé áp dụng" trong dialog Chỉnh sửa ngày lễ, vd. "Thứ 3 — Áp dụng giá
 * ngày thường." / "Thứ 7 — Áp dụng giá cuối tuần.".
 */
export const describeHolidayPriceChoice = (
  day: Pick<HolidayProps, "dateValue" | "dateTypeId">,
  applyHolidayPrice: boolean
) => {
  if (applyHolidayPrice) return "Áp dụng giá ngày lễ.";
  const group = getBaseTab(day) === "weekend" ? "cuối tuần" : "ngày thường";
  return `${formatWeekday(day.dateValue)} — Áp dụng giá ${group}.`;
};

/**
 * "Giá vé" trong box "Kết quả thiết lập" của dialog ngày lễ: Giá ngày lễ, hoặc nhóm giá của phân loại gốc khi chọn
 * "Theo giá ngày trong tuần".
 */
export const getHolidayResultPriceLabel = (
  day: Pick<HolidayProps, "dateTypeId">,
  applyHolidayPrice: boolean
) => {
  if (applyHolidayPrice) return "Giá ngày lễ";
  return getBaseTab(day) === "weekend" ? "Giá cuối tuần" : "Giá ngày thường";
};

export type DayU22Policy = {
  label: "Có thể áp dụng" | "Không áp dụng" | "Chưa xác định";
  /** `null`: chưa xác định được (chưa tải / không đọc được chính sách của ngày). */
  blocked: boolean | null;
  /** Nội dung tooltip. */
  reason: string;
};

export const U22_ALLOWED_TOOLTIP =
  "Ngày này được xét ưu đãi U22. Việc áp dụng thực tế còn phụ thuộc điều kiện khách hàng và suất chiếu.";
export const U22_BLOCKED_TOOLTIP = "Ngày này không áp dụng ưu đãi U22 theo chính sách NCC.";
export const U22_UNKNOWN_TOOLTIP = "Chưa tải được chính sách U22 của ngày này.";

/**
 * Chính sách U22 theo ngày: ngày lễ (dù chọn giá nào) hoặc ngày tắt U22 → "Không áp dụng"; ngày thường/cuối tuần
 * chỉ "Có thể áp dụng" khi đã đọc được cờ (`false`), còn lại (null/không có) → "Chưa xác định", không mặc định
 * cho phép.
 */
export const getDayU22Policy = (day: DayFlags): DayU22Policy => {
  if (day.isHoliday || day.isPromotionExcluded === true) {
    return { label: "Không áp dụng", blocked: true, reason: U22_BLOCKED_TOOLTIP };
  }
  if (day.isPromotionExcluded === false) {
    return { label: "Có thể áp dụng", blocked: false, reason: U22_ALLOWED_TOOLTIP };
  }
  return { label: "Chưa xác định", blocked: null, reason: U22_UNKNOWN_TOOLTIP };
};

/** Tên hiển thị: tên ngày lễ đã lưu (DB không lưu tên cho ngày không áp ưu đãi). */
export const getDayDisplayName = (day: Pick<HolidayProps, "isHoliday" | "holidayName">) =>
  day.isHoliday && day.holidayName?.trim() ? day.holidayName.trim() : null;
