import { HolidaysQuery } from "@renderer/api/holidays.api";

export const holidaysKeys = {
  all: ["holidays"] as const,
  getAll: (params: HolidaysQuery) => ["holidays", params] as const,
  year: (year: number) => ["holidays", "year", year] as const,
  screeningDates: (year: number) => ["holidays", "screening-dates", year] as const
};
