import { SCHEDULE_DISPLAY_TIMEZONE } from "@shared/types";

export const getServerOffset = (serverNow: string, clientNow = Date.now()) =>
  new Date(serverNow).getTime() - clientNow;

export const getServerTime = (serverOffset: number, clientNow = Date.now()) =>
  new Date(clientNow + serverOffset);

export const isScheduleSessionPast = (startAt: string, serverTime: Date) =>
  new Date(startAt).getTime() <= serverTime.getTime();

// The TV schedule uses Vietnam time (UTC+7, no DST). Older WebViews can lack
// Intl, timezone data or formatToParts; none should tear down the React tree.
const vietnamDate = (date: Date) => new Date(date.getTime() + 7 * 60 * 60 * 1000);
const twoDigits = (value: number) => (value < 10 ? `0${value}` : String(value));
const fallbackClock = (date: Date, seconds = false) => {
  const local = vietnamDate(date);
  return `${twoDigits(local.getUTCHours())}:${twoDigits(local.getUTCMinutes())}${
    seconds ? `:${twoDigits(local.getUTCSeconds())}` : ""
  }`;
};
const withIntlFallback = (format: () => string, fallback: () => string) => {
  try {
    return format();
  } catch {
    return fallback();
  }
};

export const formatScheduleClock = (date: Date) =>
  withIntlFallback(
    () =>
      new Intl.DateTimeFormat("vi-VN", {
        timeZone: SCHEDULE_DISPLAY_TIMEZONE,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      }).format(date),
    () => fallbackClock(date, true)
  );

export const formatScheduleWeekday = (date: Date) =>
  withIntlFallback(
    () =>
      new Intl.DateTimeFormat("vi-VN", {
        timeZone: SCHEDULE_DISPLAY_TIMEZONE,
        weekday: "long"
      }).format(date),
    () =>
      ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"][
        vietnamDate(date).getUTCDay()
      ]
  );

export const formatScheduleDate = (date: Date) =>
  withIntlFallback(
    () => {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: SCHEDULE_DISPLAY_TIMEZONE,
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }).formatToParts(date);
      const getPart = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((part) => part.type === type)?.value ?? "";

      return `${getPart("day")}/${getPart("month")}/${getPart("year")}`;
    },
    () => {
      const local = vietnamDate(date);
      return `${twoDigits(local.getUTCDate())}/${twoDigits(local.getUTCMonth() + 1)}/${local.getUTCFullYear()}`;
    }
  );

export const formatScheduleDataTime = (value: string) =>
  withIntlFallback(
    () =>
      new Intl.DateTimeFormat("vi-VN", {
        timeZone: SCHEDULE_DISPLAY_TIMEZONE,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }).format(new Date(value)),
    () => fallbackClock(new Date(value))
  );
