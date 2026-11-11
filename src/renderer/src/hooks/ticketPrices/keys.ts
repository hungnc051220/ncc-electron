import { TicketPriceByPlanDto } from "@renderer/api/ticketPrices.api";
import { UsersQuery } from "@renderer/api/users.api";

export const ticketPricesKeys = {
  all: ["ticket-prices"] as const,
  getAll: (params: UsersQuery) => ["ticket-prices", params] as const,
  getDetail: (id: number) => ["ticket-price", id] as const,
  allByPlan: ["ticket-price-by-plan"] as const,
  getByPlan: (dto: TicketPriceByPlanDto) => ["ticket-price-by-plan", dto] as const,
  u22Config: ["u22-price-config"] as const,
  rules: ["pricing-rules"] as const
};
