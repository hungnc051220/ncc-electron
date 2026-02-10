import { api } from "@renderer/api/client";
import { ApiResponse, PlanScreeningDetailProps } from "@renderer/types";
import queryString from "query-string";

export interface PlanScreeningsQuery {
  current?: number;
  pageSize?: number;
  planCinemaId?: number;
  fromDate?: string;
  toDate?: string;
}

export interface PlanScreeningDto {
  filmId: number;
  roomId: number;
  projectDate: string;
  projectTime: string;
  priceOfPosition1: string;
  priceOfPosition2: string;
  priceOfPosition3: string;
  priceOfPosition4: string;
  isOnlineSelling?: number;
}

export const planScreeningsApi = {
  getAll: async (params: PlanScreeningsQuery): Promise<ApiResponse<PlanScreeningDetailProps>> => {
    const { current, pageSize, planCinemaId, fromDate, toDate } = params;

    const filter: Record<string, unknown> = {};

    if (planCinemaId) {
      filter.planCinemaId = planCinemaId;
    }

    if (fromDate && toDate) {
      filter.projectDate = { between: [fromDate, toDate] };
    }

    const queryObject: Record<string, unknown> = {
      current,
      pageSize,
      sort: "projectDate.desc"
    };

    if (Object.keys(filter).length > 0) {
      queryObject.filter = JSON.stringify(filter);
    }

    const query = queryString.stringify(queryObject, {
      skipEmptyString: true,
      skipNull: true
    });

    const res = await api.get(`/api/pos/plan-screenings?${query}`);

    return res.data;
  },
  getDetail: async (id: number): Promise<PlanScreeningDetailProps> => {
    const res = await api.get(`/api/pos/plan-screenings/${id}`);
    return res.data;
  },
  getByDate: async (date: string): Promise<PlanScreeningDetailProps> => {
    const res = await api.get(`/api/pos/plan-screenings/get-by-date?date=${date}`);
    return res.data;
  },
  create: async (dto: PlanScreeningDto) => {
    const res = await api.post("/api/pos/plan-screenings", dto);
    return res.data;
  },
  update: async (id: number, dto: PlanScreeningDto) => {
    const res = await api.patch(`/api/pos/plan-screenings/${id}`, dto);
    return res.data;
  },
  delete: async (ids: number[]) => {
    const results = await Promise.all(
      ids?.map((id: number) => api.delete(`/api/pos/plan-screenings/${id}`))
    );

    return results;
  }
};
