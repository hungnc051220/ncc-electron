import { PlanScreeningsQuery } from "@renderer/api/planScreenings.api";

export const planScreeningsKeys = {
  all: ["plan-screenings"] as const,
  getAll: (params: PlanScreeningsQuery) => ["plan-screenings", params] as const,
  getDetail: (id: number) => ["plan-screening", id] as const,
  getByDate: (date: string) => ["plan-screening-by-date", date] as const
};
