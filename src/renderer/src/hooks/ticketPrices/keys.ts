import { TicketPriceByPlanDto } from "@renderer/api/ticketPrices.api";
import { UsersQuery } from "@renderer/api/users.api";

export const ticketPricesKeys = {
  all: ["ticket-prices"] as const,
  getAll: (params: UsersQuery) => ["ticket-prices", params] as const,
  getDetail: (id: number) => ["ticket-price", id] as const,
  getByPlan: (dto: TicketPriceByPlanDto) => ["ticket-price-by-plan", dto] as const
};
