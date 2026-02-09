import { UsersQuery } from "@renderer/api/users.api";

export const seatTypesKeys = {
  all: ["seat-types"] as const,
  getAll: (params: UsersQuery) => ["seat-types", params] as const,
  getDetail: (id: number) => ["seat-type", id] as const
};
