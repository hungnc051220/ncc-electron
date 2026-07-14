import { api } from "@renderer/api/client";
import { ApiResponse, CancellationTicketProps } from "@shared/types";
import queryString from "query-string";

export interface CancelTicketsQuery {
  current: number;
  pageSize: number;
  filmId?: number;
  userId?: number;
  fromDate?: string;
  toDate?: string;
  orderId?: number;
}

export const cancelTicketsApi = {
  getAll: async (params: CancelTicketsQuery): Promise<ApiResponse<CancellationTicketProps>> => {
    const { current, pageSize, filmId, userId, fromDate, toDate, orderId } = params;

    const filter: Record<string, unknown> = {};

    if (orderId) {
      filter.orderId = orderId;
    }

    if (filmId) {
      filter.filmId = filmId;
    }

    if (userId) {
      filter.userId = userId;
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

    const query = queryString.stringify(queryObject, {
      skipEmptyString: true,
      skipNull: true
    });

    const res = await api.get(`/pos/cancel-ticket?${query}`);

    return res.data;
  },

  cancelEInvoice: async (cancelTicketId: number): Promise<void> => {
    await api.post(`/pos/cancel-ticket/${cancelTicketId}/cancel-einvoice`);
  }
};
