import { api } from "@renderer/api/client";
import { ApiResponse, CancellationTicketProps } from "@renderer/types";
import queryString from "query-string";

export interface CancelTicketsQuery {
  current: number;
  pageSize: number;
  filmId?: number;
  userId?: number;
  fromDate?: string;
  toDate?: string;
}

export const cancelTicketsApi = {
  getAll: async (params: CancelTicketsQuery): Promise<ApiResponse<CancellationTicketProps>> => {
    const { current, pageSize, filmId, userId, fromDate, toDate } = params;

    const filter: Record<string, unknown> = {};

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
  }
};
