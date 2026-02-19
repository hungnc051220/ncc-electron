import { api } from "@renderer/api/client";
import { ApiResponse, PlanFilmProps } from "@shared/types";
import queryString from "query-string";

export interface PlanFilmsQuery {
  current: number;
  pageSize: number;
  planCinemaId?: number;
}

export interface PlanFilmDto {
  planCinemaId: number;
  filmId: number;
  order: number;
}

export const planFilmsApi = {
  getAll: async (params: PlanFilmsQuery): Promise<ApiResponse<PlanFilmProps>> => {
    const { current, pageSize, planCinemaId } = params;

    const filter: Record<string, unknown> = {};

    if (planCinemaId) {
      filter.planCinemaId = planCinemaId;
    }

    const queryObject: Record<string, unknown> = {
      current,
      pageSize,
      sort: "order"
    };

    if (Object.keys(filter).length > 0) {
      queryObject.filter = JSON.stringify(filter);
    }

    const query = queryString.stringify(queryObject, {
      skipEmptyString: true,
      skipNull: true
    });

    const res = await api.get(`/api/pos/plan-film?${query}`);

    return res.data;
  },
  getDetail: async (id: number): Promise<PlanFilmProps> => {
    const res = await api.get(`/api/pos/plan-film/${id}`);
    return res.data;
  },
  create: async (dto: PlanFilmDto[]) => {
    const res = await api.post("/api/pos/plan-film", { data: dto });
    return res.data;
  },
  update: async (dto: PlanFilmDto[]) => {
    const res = await api.patch("/api/pos/plan-film", { data: dto });
    return res.data;
  },
  delete: async (dto: PlanFilmDto[]) => {
    const res = await api.delete("/api/pos/plan-film", { data: { data: dto } });
    return res.data;
  }
};
