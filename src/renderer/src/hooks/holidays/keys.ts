import { HolidaysQuery } from "@renderer/api/holidays.api";

export const holidaysKeys = {
  all: ["holidays"] as const,
  getAll: (params: HolidaysQuery) => ["holidays", params] as const
};
