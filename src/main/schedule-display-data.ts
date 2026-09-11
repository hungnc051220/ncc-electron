import type { ScheduleDisplayMovie, ScheduleDisplaySession } from "@shared/types";
import { SCHEDULE_DISPLAY_TIMEZONE } from "@shared/types";

export interface NormalizedScheduleDisplayData {
  date: string;
  movies: ScheduleDisplayMovie[];
}

interface RawScheduleSession {
  Id?: unknown;
  ProjectTime?: unknown;
  Deleted?: unknown;
}

interface RawScheduleMovie {
  Id?: unknown;
  FilmName?: unknown;
  ImageUrl?: unknown;
  Duration?: unknown;
  VersionCode?: unknown;
  LanguageCode?: unknown;
  AgeAboveShow?: unknown;
  Deleted?: unknown;
  isFree?: unknown;
  lstSession?: unknown;
}

interface RawScheduleDay {
  Day?: unknown;
  lstFilm?: unknown;
}

interface RawScheduleResponse {
  listday?: unknown;
}

const asString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const asNumber = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

const asId = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) return value.trim();
  return undefined;
};

const isDeleted = (value: unknown) => value === true || value === 1 || value === "true";

const getDateParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SCHEDULE_DISPLAY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day")
  };
};

export const getScheduleApiDateKey = (date: Date) => {
  const { year, month, day } = getDateParts(date);
  return `${Number(day)}-${Number(month)}-${year}`;
};

export const getScheduleDate = (date: Date) => {
  const { year, month, day } = getDateParts(date);
  return `${year}-${month}-${day}`;
};

export const formatScheduleServerTime = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: SCHEDULE_DISPLAY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${getPart("year")}-${getPart("month")}-${getPart("day")}T${getPart("hour")}:${getPart("minute")}:${getPart("second")}+07:00`;
};

const normalizeStartTime = (value: unknown, fallbackDate: string) => {
  const rawValue = asString(value);
  const match = rawValue.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);

  if (!match) return undefined;

  const [, date = fallbackDate, hour, minute, second = "00"] = match;
  return {
    time: `${hour}:${minute}`,
    startAt: `${date}T${hour}:${minute}:${second}+07:00`
  };
};

const normalizeSession = (
  value: RawScheduleSession,
  fallbackDate: string
): ScheduleDisplaySession | undefined => {
  if (isDeleted(value.Deleted)) return undefined;

  const id = asId(value.Id);
  const start = normalizeStartTime(value.ProjectTime, fallbackDate);

  if (id === undefined || !start) return undefined;
  return { id, ...start };
};

const normalizeMovie = (
  value: RawScheduleMovie,
  fallbackDate: string
): ScheduleDisplayMovie | undefined => {
  if (isDeleted(value.Deleted)) return undefined;

  const id = asId(value.Id);
  const title = asString(value.FilmName);
  if (id === undefined || !title) return undefined;

  const rawSessions = Array.isArray(value.lstSession) ? value.lstSession : [];
  const sessions = rawSessions
    .map((session) => normalizeSession(session as RawScheduleSession, fallbackDate))
    .filter((session): session is ScheduleDisplaySession => Boolean(session))
    .sort((left, right) => left.startAt.localeCompare(right.startAt));

  if (sessions.length === 0) return undefined;

  return {
    id,
    title,
    posterUrl: asString(value.ImageUrl) || null,
    durationMinutes: asNumber(value.Duration) ?? null,
    ageRating: asString(value.AgeAboveShow) || null,
    version: asString(value.VersionCode) || null,
    language: asString(value.LanguageCode) || null,
    free: value.isFree === true,
    sessions
  };
};

export function normalizeScheduleDisplayData(
  response: unknown,
  now = new Date()
): NormalizedScheduleDisplayData {
  const date = getScheduleDate(now);
  const days = Array.isArray((response as RawScheduleResponse)?.listday)
    ? ((response as RawScheduleResponse).listday as RawScheduleDay[])
    : [];
  const currentDay = days.find((item) => asString(item.Day) === getScheduleApiDateKey(now));
  const rawMovies = Array.isArray(currentDay?.lstFilm) ? currentDay.lstFilm : [];
  const movies = rawMovies
    .map((movie) => normalizeMovie(movie as RawScheduleMovie, date))
    .filter((movie): movie is ScheduleDisplayMovie => Boolean(movie))
    .sort((left, right) => left.sessions[0].startAt.localeCompare(right.sessions[0].startAt));

  return { date, movies };
}
