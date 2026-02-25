import { PlanCinemasQuery } from "@renderer/api/planCinemas.api";

export const planCinemasKeys = {
  all: ["plan-cinemas"] as const,
  getAll: (params: PlanCinemasQuery) => ["plan-cinemas", params] as const,
  getDetail: (id: number) => ["plan-cinema", id] as const
};
