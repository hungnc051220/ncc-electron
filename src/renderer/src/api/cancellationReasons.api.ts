import { api } from "@renderer/api/client";
import { ApiResponse, CancellationReasonProps } from "@renderer/types";
import queryString from "query-string";

export interface CanncellationReasonsQuery {
  current: number;
  pageSize: number;
}

export interface CanncellationReasonDto {
  id?: number;
  reason?: string;
}

export const cancellationReasonsApi = {
  getAll: async (
    params: CanncellationReasonsQuery
  ): Promise<ApiResponse<CancellationReasonProps>> => {
    const { current, pageSize } = params;

    const filter: Record<string, unknown> = {
      Deleted: false
    };

    const queryObject: Record<string, unknown> = {
      current,
      pageSize
    };

    if (Object.keys(filter).length > 0) {
      queryObject.filter = JSON.stringify(filter);
    }

    const query = queryString.stringify(queryObject, {
      skipEmptyString: true,
      skipNull: true
    });

    const res = await api.get(`/api/pos/order/cancel-reason?${query}`);

    return res.data;
  },
  create: async (dto: CanncellationReasonDto) => {
    const res = await api.post("/api/pos/order/cancel-reason", dto);
    return res.data;
  },
  update: async (id: number, dto: CanncellationReasonDto) => {
    const res = await api.patch(`/api/pos/order/cancel-reason/${id}`, dto);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/api/pos/order/cancel-reason/${id}`);
    return res.data;
  }
};
