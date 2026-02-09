import { ShowTimeSlotsQuery } from "@renderer/api/showTimeSlots.api";

export const showTimeSlotsKeys = {
  all: ["showtime-slots"] as const,
  getAll: (params: ShowTimeSlotsQuery) => ["showtime-slots", params] as const,
  getDetail: (id: number) => ["showtime-slot", id] as const
};
