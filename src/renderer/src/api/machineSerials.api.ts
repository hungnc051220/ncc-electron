import { api } from "@renderer/api/client";
import { ApiResponse, MachineSerialProps } from "@shared/types";
import queryString from "query-string";

export interface MachineSerialsQuery {
  current: number;
  pageSize: number;
  year?: number;
}

export const machineSerialsApi = {
  getAll: async (params: MachineSerialsQuery): Promise<ApiResponse<MachineSerialProps>> => {
    const { current, pageSize, year } = params;

    const filter: Record<string, unknown> = {};

    if (year) {
      filter.activeYear = year;
    }

    const queryObject: Record<string, unknown> = {
      current,
      pageSize,
      sort: "activeYear.desc"
    };

    if (Object.keys(filter).length > 0) {
      queryObject.filter = JSON.stringify(filter);
    }

    const query = queryString.stringify(queryObject, {
      skipEmptyString: true,
      skipNull: true
    });

    const res = await api.get(`/api/pos/print-times?${query}`);
    return res.data;
  }
};
