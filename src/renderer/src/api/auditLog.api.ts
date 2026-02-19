import { api } from "@renderer/api/client";
import { ApiResponse, AuditLogProps } from "@shared/types";
import queryString from "query-string";

export interface AuditLogQuery {
  current: number;
  pageSize: number;
  model?: string;
  userId?: number;
  fromDate?: string;
  toDate?: string;
}

export const auditLogApi = {
  getAll: async (params: AuditLogQuery): Promise<ApiResponse<AuditLogProps>> => {
    const { current, pageSize, model, userId, fromDate, toDate } = params;

    const filter: Record<string, unknown> = {};

    if (userId) {
      filter.userId = userId;
    }

    if (model) {
      filter.model = model;
    }

    if (fromDate && toDate) {
      filter.timestamp = {
        between: [fromDate, toDate]
      };
    }

    const queryObject: Record<string, unknown> = {
      current,
      pageSize,
      sort: "timestamp.desc"
    };

    if (Object.keys(filter).length > 0) {
      queryObject.filter = JSON.stringify(filter);
    }

    const query = queryString.stringify(queryObject, {
      skipEmptyString: true,
      skipNull: true
    });

    const res = await api.get(`/pos/audit-log?${query}`);

    return res.data;
  }
};
