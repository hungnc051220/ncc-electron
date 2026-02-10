import { OrdersQuery } from "@renderer/api/orders.api";

export const ordersKeys = {
  all: ["orders"] as const,
  getAll: (params: OrdersQuery) => ["orders", params] as const,
  getDetail: (id: number) => ["order", id] as const
};
