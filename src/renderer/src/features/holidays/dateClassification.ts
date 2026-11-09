import type { HolidayProps } from "@shared/types";
import dayjs from "dayjs";

/**
 * Danh sách ngày: mỗi ngày có phân loại nền `DateTypeId` (1 = Ngày thường, 2 = Cuối tuần; ý nghĩa giữ
 * nguyên trong DB, dùng khi lên lịch suất chiếu) và cờ `isHoliday`. Tab hiển thị: ngày lễ ưu tiên, còn
 * lại theo phân loại nền thực tế (không suy từ thứ trong tuần).
 */
export type DateTab = "normal" | "weekend" | "holiday";
export type BaseDateTab = Exclude<DateTab, "holiday">;
export type DateTypeId = 1 | 2;

export const DATE_TAB_LABELS: Record<DateTab, string> = {
  normal: "Ngày thường",
  weekend: "Cuối tuần",
  holiday: "Ngày lễ"
};

export const DATE_TYPE_BY_TAB: Record<BaseDateTab, DateTypeId> = { normal: 1, weekend: 2 };

/** Phân loại nền (bỏ qua cờ lễ): `DateTypeId` 2 → Cuối tuần, còn lại → Ngày thường. */
export const getBaseTab = (day: Pick<HolidayProps, "dateTypeId">): BaseDateTab =>
  day.dateTypeId === DATE_TYPE_BY_TAB.weekend ? "weekend" : "normal";

export const classifyDate = (day: Pick<HolidayProps, "dateTypeId" | "isHoliday">): DateTab =>
  day.isHoliday ? "holiday" : getBaseTab(day);

/** Tab ngày sẽ trở về khi bỏ đánh dấu ngày lễ: phân loại nền, không đổi khi đánh dấu/bỏ đánh dấu. */
export const getTabAfterUnmark = (day: Pick<HolidayProps, "dateTypeId">): BaseDateTab =>
  getBaseTab(day);

export const formatWeekday = (dateValue: string) => {
  const day = dayjs(dateValue).day();
  return day === 0 ? "Chủ nhật" : `Thứ ${day + 1}`;
};

export const formatDate = (dateValue: string) => dayjs(dateValue).format("DD/MM/YYYY");

export const normalizeDateValue = (dateValue: string) => dateValue.slice(0, 10);

// ---------- Thiết lập ngày thường / cuối tuần theo thứ ----------

/** Thứ trong tuần theo `dayjs().day()` (0 = Chủ nhật … 6 = Thứ 7), hiển thị từ Thứ 2. */
export const WEEKDAYS = [
  { day: 1, label: "Thứ 2" },
  { day: 2, label: "Thứ 3" },
  { day: 3, label: "Thứ 4" },
  { day: 4, label: "Thứ 5" },
  { day: 5, label: "Thứ 6" },
  { day: 6, label: "Thứ 7" },
  { day: 0, label: "Chủ nhật" }
] as const;

/** Phân loại nền của từng thứ, khóa là `dayjs().day()`. */
export type WeekdayConfig = Record<number, BaseDateTab>;

const weekendFrom = (weekendDays: number[]): WeekdayConfig =>
  Object.fromEntries(
    WEEKDAYS.map(({ day }) => [day, weekendDays.includes(day) ? "weekend" : "normal"])
  );

export const WEEKDAY_TEMPLATES = [
  { key: "A", label: "T2–T5 thường, T6–CN cuối tuần", config: weekendFrom([5, 6, 0]) },
  { key: "B", label: "T2–T6 thường, T7–CN cuối tuần", config: weekendFrom([6, 0]) }
] as const;

/** Nhãn hiển thị của hai mẫu chọn nhanh (popup Thiết lập ngày, Khởi tạo năm). */
export const WEEKDAY_TEMPLATE_LABELS: Record<string, string> = {
  A: "T2 – T5 ngày thường, T6 – CN cuối tuần",
  B: "T2 – T6 ngày thường, T7 – CN cuối tuần"
};

/** Các thứ (`dayjs().day()`) xếp Cuối tuần của một cấu hình, theo thứ tự hiển thị T2 → CN. */
export const weekendDaysOf = (config: WeekdayConfig) =>
  WEEKDAYS.filter(({ day }) => config[day] === "weekend").map(({ day }) => day);

export const isSameConfig = (left: WeekdayConfig, right: WeekdayConfig) =>
  WEEKDAYS.every(({ day }) => left[day] === right[day]);

/**
 * Cấu hình thực tế của năm: mỗi thứ lấy phân loại nền chiếm đa số các ngày của thứ đó (hòa → Ngày
 * thường). Thứ chưa có ngày nào lấy theo mẫu A (mặc định của hệ thống).
 */
export const inferWeekdayConfig = (
  days: Pick<HolidayProps, "dateValue" | "dateTypeId">[]
): WeekdayConfig => {
  const weekendVotes = new Map<number, number>();
  const totals = new Map<number, number>();
  days.forEach((item) => {
    const weekday = dayjs(item.dateValue).day();
    totals.set(weekday, (totals.get(weekday) ?? 0) + 1);
    if (getBaseTab(item) === "weekend")
      weekendVotes.set(weekday, (weekendVotes.get(weekday) ?? 0) + 1);
  });
  const fallback = WEEKDAY_TEMPLATES[0].config;
  return Object.fromEntries(
    WEEKDAYS.map(({ day }) => {
      const total = totals.get(day) ?? 0;
      if (!total) return [day, fallback[day]];
      return [day, (weekendVotes.get(day) ?? 0) * 2 > total ? "weekend" : "normal"];
    })
  );
};

/** Ngày ngoại lệ: phân loại nền khác cấu hình hiện tại của thứ đó (vd. 01/01 là Thứ 5 nhưng xếp Cuối tuần). */
export const findExceptions = <T extends Pick<HolidayProps, "dateValue" | "dateTypeId">>(
  days: T[],
  config: WeekdayConfig
) => days.filter((item) => getBaseTab(item) !== config[dayjs(item.dateValue).day()]);

export type ReclassificationPlan<T> = {
  /** Ngày đổi sang Ngày thường / Cuối tuần (sắp theo ngày). */
  toNormal: T[];
  toWeekend: T[];
  /** Ngày ngoại lệ được giữ nguyên dù khác cấu hình mới. */
  keptExceptions: T[];
};

/**
 * Các ngày phải đổi phân loại nền để khớp cấu hình mới. Ngày ngoại lệ (theo cấu hình hiện tại) được giữ
 * nguyên khi `keepExceptions`. Chỉ phân loại nền thay đổi; cờ lễ và tên ngày lễ không bị đụng tới.
 */
export const planReclassification = <T extends Pick<HolidayProps, "dateValue" | "dateTypeId">>({
  days,
  current,
  next,
  keepExceptions
}: {
  days: T[];
  current: WeekdayConfig;
  next: WeekdayConfig;
  keepExceptions: boolean;
}): ReclassificationPlan<T> => {
  const exceptions = new Set(findExceptions(days, current).map((item) => item.dateValue));
  const plan: ReclassificationPlan<T> = { toNormal: [], toWeekend: [], keptExceptions: [] };
  [...days]
    .sort((left, right) => left.dateValue.localeCompare(right.dateValue))
    .forEach((item) => {
      const target = next[dayjs(item.dateValue).day()];
      if (getBaseTab(item) === target) return;
      if (keepExceptions && exceptions.has(item.dateValue)) {
        plan.keptExceptions.push(item);
        return;
      }
      (target === "weekend" ? plan.toWeekend : plan.toNormal).push(item);
    });
  return plan;
};

/** `MM-DD` cho `bulk-create` (`specialDates`): gửi đúng những ngày cần đổi, không đổi cả thứ. */
export const toMonthDay = (dateValue: string) => normalizeDateValue(dateValue).slice(5);
