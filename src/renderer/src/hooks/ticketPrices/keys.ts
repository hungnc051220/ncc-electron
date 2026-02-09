import { UsersQuery } from "@renderer/api/users.api";

export const ticketPricesKeys = {
  all: ["ticket-prices"] as const,
  getAll: (params: UsersQuery) => ["ticket-prices", params] as const
};
