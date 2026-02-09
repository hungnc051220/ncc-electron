import { api } from "@renderer/api/client";
import { ApiResponse, TicketPriceProps } from "@renderer/types";
import queryString from "query-string";

export interface TicketPricesQuery {
  current: number;
  pageSize: number;
}

export interface TicketPriceDto {
  id?: number;
  versionCode: string;
  daypartId: number;
  positionId: number;
  price: number;
}

export const ticketPricesApi = {
  getAll: async (params: TicketPricesQuery): Promise<ApiResponse<TicketPriceProps>> => {
    const { current, pageSize } = params;

    const filter: Record<string, unknown> = {};

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

    const res = await api.get(`/api/pos/pricing?${query}`);

    return res.data;
  },
  create: async (dto: TicketPriceDto) => {
    const res = await api.post("/api/pos/pricing", dto);
    return res.data;
  },
  update: async (id: number, dto: TicketPriceDto) => {
    const res = await api.put(`/api/pos/pricing/${id}`, dto);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/api/pos/pricing/${id}`);
    return res.data;
  }
};
