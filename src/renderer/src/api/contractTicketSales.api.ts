import { api } from "@renderer/api/client";
import { ApiResponse, OrderDetailProps } from "@shared/types";
import queryString from "query-string";

export interface ContractTicketSalesQuery {
  current: number;
  pageSize: number;
  fromDate?: number;
  toDate?: string;
}

export interface ContractTicketSaleDto {
  customerFirstName: string;
  customerPhone: string;
  orderTotal: number;
}

export interface SetSeatsContractTicketSaleDto {
  planScreenId: number;
  floorNo: number;
  listChairIndexF1?: string;
  listChairValueF1?: string;
  listChairIndexF2?: string;
  listChairValueF2?: string;
  listChairIndexF3?: string;
  listChairValueF3?: string;
  operation?: number;
}

export const contractTicketSalesApi = {
  getAll: async (params: ContractTicketSalesQuery): Promise<ApiResponse<OrderDetailProps>> => {
    const { current, pageSize, fromDate, toDate } = params;

    const filter: Record<string, unknown> = {};

    if (fromDate && toDate) {
      filter.createdOnUtc = { between: [fromDate, toDate] };
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

    const res = await api.get(`/api/pos/order-contract?${query}`);

    return res.data;
  },
  create: async (dto: ContractTicketSaleDto) => {
    const res = await api.post("/api/pos/order-contract", dto);
    return res.data;
  },
  update: async (id: number, dto: ContractTicketSaleDto) => {
    const res = await api.put(`/api/pos/order-contract/${id}`, dto);
    return res.data;
  },
  setSeats: async (id: number, dto: SetSeatsContractTicketSaleDto) => {
    const res = await api.post(`/api/pos/order-contract/${id}/set-seats`, dto);
    return res.data;
  }
};
