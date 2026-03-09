import { api } from "@renderer/api/client";
import { ApiResponse, InvoiceProps } from "@shared/types";
import queryString from "query-string";

export interface InvoicesQuery {
  current: number;
  pageSize: number;
  orderId?: number;
}

export interface InvoiceDto {
  orderId: number;
  partyA?: string;
  address?: string;
  taxCode?: string;
  phoneNumber?: string;
  email?: string;
  citizenId?: string;
  representative?: string;
  position?: string;
  imageUrl?: string;
  note?: string;
}

export interface UpdateStatusInvoiceDto {
  status: "new" | "processing" | "completed";
}

export const invoicesApi = {
  getAll: async (params: InvoicesQuery): Promise<ApiResponse<InvoiceProps>> => {
    const { current, pageSize, orderId } = params;

    const filter: Record<string, unknown> = {};

    if (orderId) {
      filter.orderId = orderId;
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

    const res = await api.get(`/api/pos/invoices?${query}`);

    return res.data;
  },
  getDetail: async (id: number): Promise<InvoiceProps> => {
    const res = await api.get(`/api/pos/invoices/${id}`);
    return res.data;
  },
  create: async (dto: InvoiceDto) => {
    const res = await api.post("/api/pos/invoices", dto);
    return res.data;
  },
  update: async (id: number, dto: InvoiceDto) => {
    const res = await api.patch(`/api/pos/invoices/${id}`, dto);
    return res.data;
  },
  updateStatus: async (id: number, dto: UpdateStatusInvoiceDto) => {
    const res = await api.patch(`/api/pos/invoices/${id}/status`, dto);
    return res.data;
  }
};
