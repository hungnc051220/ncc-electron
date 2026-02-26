import { api } from "@renderer/api/client";
import { ApiResponse, CustomerPosProps } from "@shared/types";
import queryString from "query-string";

export interface CustomerQuery {
  current: number;
  pageSize: number;
  cardCode?: string;
}

export const customerApi = {
  getAll: async (params: CustomerQuery): Promise<ApiResponse<CustomerPosProps>> => {
    const { current, pageSize, cardCode } = params;

    const filter: Record<string, unknown> = {};

    if (cardCode) {
      filter.cardCode = cardCode;
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

    const res = await api.get(`/api/web/v1/pos/web-customers?${query}`);

    return res.data;
  }
};
