import { UsersQuery } from "@renderer/api/users.api";

export const usersKeys = {
  all: ["users"] as const,
  getAll: (params: UsersQuery) => ["users", params] as const,
  getDetail: (id: number) => ["user", id] as const
};
