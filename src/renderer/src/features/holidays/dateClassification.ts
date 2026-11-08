import type { HolidayProps } from "@shared/types";
import dayjs from "dayjs";

/**
 * Tab của Quản lý ngày V2 (phân loại ở FE, không phụ thuộc loại giá `DateTypeId`):
 * ngày lễ (`isHoliday`) → "holiday"; không phải lễ: T2–T5 → "normal", T6–CN → "weekend".
 */
export type DateTab = "normal" | "weekend" | "holiday";

export const DATE_TAB_LABELS: Record<DateTab, string> = {
  normal: "Ngày thường",
  weekend: "Cuối tuần",
  holiday: "Ngày lễ"
};

/** dayjs().day(): 0 = Chủ nhật … 6 = Thứ 7. */
const WEEKEND_DAYS = new Set([5, 6, 0]);

export const isWeekendDate = (dateValue: string) => WEEKEND_DAYS.has(dayjs(dateValue).day());

export const classifyDate = (day: Pick<HolidayProps, "dateValue" | "isHoliday">): DateTab => {
  if (day.isHoliday) return "holiday";
  return isWeekendDate(day.dateValue) ? "weekend" : "normal";
};

/** Tab ngày sẽ trở về khi bỏ đánh dấu ngày lễ. */
export const getTabAfterUnmark = (dateValue: string): DateTab =>
  isWeekendDate(dateValue) ? "weekend" : "normal";

export const formatWeekday = (dateValue: string) => {
  const day = dayjs(dateValue).day();
  return day === 0 ? "Chủ nhật" : `Thứ ${day + 1}`;
};

export const formatDate = (dateValue: string) => dayjs(dateValue).format("DD/MM/YYYY");

/** Nhãn loại giá (`DateTypeId`) dùng khi lên lịch suất chiếu; không quyết định U22. */
export const PRICE_TYPE_LABELS: Record<number, string> = {
  1: "Giá ngày thường",
  2: "Giá T6, T7, CN và ngày lễ"
};

export const normalizeDateValue = (dateValue: string) => dateValue.slice(0, 10);
