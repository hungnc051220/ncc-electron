import { api } from "@renderer/api/client";
import { ApiResponse, DiscountProps } from "@shared/types";
import queryString from "query-string";

export interface DiscountsQuery {
  current: number;
  pageSize: number;
}

export interface DiscountDto {
  discountName: string;
  discountType: string;
  discountAmount?: number;
  discountRate?: number;
}

export const discountsApi = {
  getAll: async (params: DiscountsQuery): Promise<ApiResponse<DiscountProps>> => {
    const { current, pageSize } = params;

    const filter: Record<string, unknown> = {
      deleted: false
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

    const res = await api.get(`/api/pos/discount?${query}`);

    return res.data;
  },
  getDetail: async (id: number): Promise<DiscountProps> => {
    const res = await api.get(`/api/pos/discount/${id}`);
    return res.data;
  },
  create: async (dto: DiscountDto) => {
    const res = await api.post("/api/pos/discount", dto);
    return res.data;
  },
  update: async (id: number, dto: DiscountDto) => {
    const res = await api.patch(`/api/pos/discount/${id}`, dto);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/api/pos/discount/${id}`);
    return res.data;
  }
};
