import { ScreeningRoomsQuery } from "@renderer/api/screeningRooms.api";

export const screeningRoomsKeys = {
  all: ["screening-rooms"] as const,
  getAll: (params: ScreeningRoomsQuery) => ["screening-rooms", params] as const,
  allChairs: ["screening-rooms", "chairs"] as const,
  getChairs: (params: ScreeningRoomsQuery) => ["screening-rooms", "chairs", params] as const
};
