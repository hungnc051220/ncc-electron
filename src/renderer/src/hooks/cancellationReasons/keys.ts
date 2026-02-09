import { UsersQuery } from "@renderer/api/users.api";

export const cancellationReasonsKeys = {
  all: ["cancellation-reasons"] as const,
  getAll: (params: UsersQuery) => ["cancellation-reasons", params] as const
};
