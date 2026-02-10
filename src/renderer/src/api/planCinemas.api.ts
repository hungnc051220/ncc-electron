import { api } from "@renderer/api/client";
import { ApiResponse, PlanCinemaProps } from "@renderer/types";
import queryString from "query-string";

export interface PlanCinemasQuery {
  current: number;
  pageSize: number;
  activeKey?: string | string[];
  fromDate?: string;
  toDate?: string;
}

export interface PlanCinemaDto {
  name: string;
  desciption?: string;
}

export interface UpdatePlanCinemaDto {
  status: number;
}

export interface ApproveRejectPlanCinemaDto {
  id: number;
  isApproved: boolean;
}

export const planCinemasApi = {
  getAll: async (params: PlanCinemasQuery): Promise<ApiResponse<PlanCinemaProps>> => {
    const { current, pageSize, activeKey, fromDate, toDate } = params;

    const filter: Record<string, unknown> = {};

    if (activeKey && activeKey !== "0") {
      filter.status = activeKey;
    }

    if (fromDate && toDate) {
      filter.createdOnUtc = { between: [fromDate, toDate] };
    }

    const queryObject: Record<string, unknown> = {
      current,
      pageSize,
      sort: "createdOnUtc.desc"
    };

    if (Object.keys(filter).length > 0) {
      queryObject.filter = JSON.stringify(filter);
    }

    if (activeKey && activeKey === "0") {
      queryObject.filter = JSON.stringify({ or: [{ status: { in: [0, 2] } }, { status: null }] });
    }

    const query = queryString.stringify(queryObject, {
      skipEmptyString: true,
      skipNull: true
    });

    const res = await api.get(`/api/pos/plan-cinema?${query}`);

    return res.data;
  },
  getDetail: async (id: number): Promise<PlanCinemaProps> => {
    const res = await api.get(`/api/pos/plan-cinema/${id}`);
    return res.data;
  },
  create: async (dto: PlanCinemaDto) => {
    const res = await api.post("/api/pos/plan-cinema", dto);
    return res.data;
  },
  update: async (id: number, dto: UpdatePlanCinemaDto) => {
    const res = await api.patch(`/api/pos/plan-cinema/${id}`, dto);
    return res.data;
  },
  approveReject: async (dto: ApproveRejectPlanCinemaDto) => {
    const res = await api.post(`/api/pos/plan-cinema/approve-reject`, dto);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/api/pos/plan-cinema/${id}`);
    return res.data;
  }
};
