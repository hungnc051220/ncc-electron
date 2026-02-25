import { ScreeningRoomsQuery } from "@renderer/api/screeningRooms.api";

export const screeningRoomsKeys = {
  all: ["screening-rooms"] as const,
  getAll: (params: ScreeningRoomsQuery) => ["screening-rooms", params] as const
};
