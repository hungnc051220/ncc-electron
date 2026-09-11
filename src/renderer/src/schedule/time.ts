import { SCHEDULE_DISPLAY_TIMEZONE } from "@shared/types";

export const getServerOffset = (serverNow: string, clientNow = Date.now()) =>
  new Date(serverNow).getTime() - clientNow;

export const getServerTime = (serverOffset: number, clientNow = Date.now()) =>
  new Date(clientNow + serverOffset);

export const isScheduleSessionPast = (startAt: string, serverTime: Date) =>
  new Date(startAt).getTime() <= serverTime.getTime();

export const formatScheduleClock = (date: Date) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: SCHEDULE_DISPLAY_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(date);

export const formatScheduleWeekday = (date: Date) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: SCHEDULE_DISPLAY_TIMEZONE,
    weekday: "long"
  }).format(date);

export const formatScheduleDate = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: SCHEDULE_DISPLAY_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${getPart("day")}/${getPart("month")}/${getPart("year")}`;
};

export const formatScheduleDataTime = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: SCHEDULE_DISPLAY_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
