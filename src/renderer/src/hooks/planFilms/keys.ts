import { PlanFilmsQuery } from "@renderer/api/planFilm.api";

export const planFilmsKeys = {
  all: ["plan-films"] as const,
  getAll: (params: PlanFilmsQuery) => ["plan-films", params] as const,
  getDetail: (id: number) => ["plan-film", id] as const
};
