import type { U22WeekPrices } from "@shared/types";

/** Khóa giá theo thứ, đúng tên trường của API (ISO 1 = Thứ 2 … 7 = Chủ nhật). */
export type U22DayKey = keyof U22WeekPrices;

/** Giá đang nhập trong dialog: ô trống là `null`. */
export type U22DraftPrices = Record<U22DayKey, number | null>;

export interface U22Day {
  key: U22DayKey;
  short: string;
  label: string;
  iso: number;
}

export interface U22Group {
  key: "weekday" | "weekend";
  label: string;
  short: string;
  days: U22DayKey[];
}

export const U22_DAYS: U22Day[] = [
  { key: "priceMon", short: "T2", label: "Thứ 2", iso: 1 },
  { key: "priceTue", short: "T3", label: "Thứ 3", iso: 2 },
  { key: "priceWed", short: "T4", label: "Thứ 4", iso: 3 },
  { key: "priceThu", short: "T5", label: "Thứ 5", iso: 4 },
  { key: "priceFri", short: "T6", label: "Thứ 6", iso: 5 },
  { key: "priceSat", short: "T7", label: "Thứ 7", iso: 6 },
  { key: "priceSun", short: "CN", label: "Chủ nhật", iso: 7 }
];

export const U22_GROUPS: U22Group[] = [
  {
    key: "weekday",
    label: "Thứ 2 – Thứ 5",
    short: "T2–T5",
    days: ["priceMon", "priceTue", "priceWed", "priceThu"]
  },
  {
    key: "weekend",
    label: "Thứ 6 – Chủ nhật",
    short: "T6–CN",
    days: ["priceFri", "priceSat", "priceSun"]
  }
];

export const U22_DAY_BY_KEY = Object.fromEntries(U22_DAYS.map((day) => [day.key, day])) as Record<
  U22DayKey,
  U22Day
>;

export const U22_MIN_PRICE = 1000;
export const U22_MAX_PRICE = 1000000;
export const U22_PRICE_STEP = 1000;

export const pickU22Prices = (source: U22WeekPrices): U22DraftPrices =>
  Object.fromEntries(U22_DAYS.map((day) => [day.key, source[day.key]])) as U22DraftPrices;

/** Mọi thứ trong nhóm đang cùng một giá (kể cả cùng đang trống). */
export const isGroupUniform = (prices: U22DraftPrices, group: U22Group) =>
  group.days.every((day) => prices[day] === prices[group.days[0]]);

/** Giá chung của nhóm khi nhóm cùng giá; `null` khi nhóm có giá riêng từng thứ hoặc đang trống. */
export const getGroupPrice = (prices: U22DraftPrices, group: U22Group) =>
  isGroupUniform(prices, group) ? prices[group.days[0]] : null;

export const hasCustomPrices = (prices: U22DraftPrices) =>
  U22_GROUPS.some((group) => !isGroupUniform(prices, group));

export interface U22Overwrite {
  day: U22DayKey;
  from: number | null;
  to: number;
}

/** Các thứ trong nhóm sẽ bị đổi giá nếu áp `value` cho cả nhóm. */
export const getOverwrites = (
  prices: U22DraftPrices,
  group: U22Group,
  value: number
): U22Overwrite[] =>
  group.days
    .filter((day) => prices[day] !== value)
    .map((day) => ({ day, from: prices[day], to: value }));

/** Các thứ có giá mới khác giá đang lưu. */
export const getChangedDays = (saved: U22DraftPrices, draft: U22DraftPrices) =>
  U22_DAYS.filter((day) => saved[day.key] !== draft[day.key]).map((day) => day.key);

/** Cùng quy tắc với backend: số nguyên 1.000–1.000.000đ, bội số 1.000đ. */
export const isValidU22Price = (value: number | null | undefined): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= U22_MIN_PRICE &&
  value <= U22_MAX_PRICE &&
  value % U22_PRICE_STEP === 0;

export const getInvalidDays = (prices: U22DraftPrices) =>
  U22_DAYS.filter((day) => !isValidU22Price(prices[day.key])).map((day) => day.key);

/** Chỉ gọi khi `getInvalidDays` rỗng. */
export const toU22WeekPrices = (prices: U22DraftPrices): U22WeekPrices =>
  Object.fromEntries(
    U22_DAYS.map((day) => [day.key, Number(prices[day.key])])
  ) as unknown as U22WeekPrices;

export const formatU22Price = (value: number | null | undefined) =>
  value === null || value === undefined || Number.isNaN(value)
    ? "—"
    : `${Number(value).toLocaleString("vi-VN")}đ`;
