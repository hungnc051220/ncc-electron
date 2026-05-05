import { api } from "@renderer/api/client";
import { ApiResponse, DiscountProps } from "@shared/types";
import dayjs from "dayjs";
import queryString from "query-string";

export interface DiscountsQuery {
  current: number;
  pageSize: number;
  onlyApplicable?: boolean;
}

export interface DiscountDto {
  discountName: string;
  discountType: string;
  discountAmount?: number;
  discountRate?: number;
  image?: string;
  startDate?: string;
  endDate?: string;
}

export const discountsApi = {
  getAll: async (params: DiscountsQuery): Promise<ApiResponse<DiscountProps>> => {
    const { current, pageSize, onlyApplicable = false } = params;

    const filter: Record<string, unknown> = {
      deleted: false
    };

    if (onlyApplicable) {
      const now = dayjs().format();
      filter.and = [
        {
          or: [{ startDate: null }, { startDate: { lte: now } }]
        },
        {
          or: [{ endDate: null }, { endDate: { gte: now } }]
        }
      ];
    }

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
