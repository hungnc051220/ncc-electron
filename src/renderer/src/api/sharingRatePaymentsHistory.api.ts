import { api } from "@renderer/api/client";
import { ApiResponse, SharingRatePaymentHistoryProps } from "@shared/types";
import queryString from "query-string";

export interface SharingRatePaymentsHistoryQuery {
  current: number;
  pageSize: number;
  manufacturerId?: number;
  filmId?: number;
  fromDate?: string;
  toDate?: string;
}

export interface SharingRatePaymentHistoryDto {
  manufacturerId: number;
  filmId: number;
  paymentDate: string;
  paidAmount: number;
  note?: string;
}

export const sharingRatePaymentsHistoryApi = {
  getAll: async (
    params: SharingRatePaymentsHistoryQuery
  ): Promise<ApiResponse<SharingRatePaymentHistoryProps>> => {
    const { current, pageSize, manufacturerId, filmId, fromDate, toDate } = params;

    const filter: Record<string, unknown> = {};

    if (manufacturerId) {
      filter.manufacturerId = manufacturerId;
    }

    if (filmId) {
      filter.filmId = filmId;
    }

    if (fromDate && toDate) {
      filter.paymentDate = { between: [fromDate, toDate] };
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

    const res = await api.get(`/api/pos/sharing-rate-payment-history?${query}`);

    return res.data;
  },
  create: async (dto: SharingRatePaymentHistoryDto[]) => {
    const res = await api.post("/api/pos/sharing-rate-payment-history", dto);
    return res.data;
  },
  update: async (id: number, dto: SharingRatePaymentHistoryDto) => {
    const res = await api.patch(`/api/pos/sharing-rate-payment-history/${id}`, {
      ...dto,
      deleted: false
    });
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/api/pos/sharing-rate-payment-history/${id}`);
    return res.data;
  }
};
