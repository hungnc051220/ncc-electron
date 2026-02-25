import { api } from "@renderer/api/client";
import { ApiResponse, DayPartProps } from "@shared/types";
import queryString from "query-string";

export interface ShowTimeSlotsQuery {
  current: number;
  pageSize: number;
}

export interface ShowTimeSlotDto {
  dateTypeId: number;
  name: string;
  fromTime?: string;
  toTime?: string;
}

export const showTimeSlotsApi = {
  getAll: async (params: ShowTimeSlotsQuery): Promise<ApiResponse<DayPartProps>> => {
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

    const res = await api.get(`/api/pos/day-part?${query}`);

    return res.data;
  },
  getDetail: async (id: number): Promise<DayPartProps> => {
    const res = await api.get(`/api/pos/day-part/${id}`);
    return res.data;
  },
  create: async (dto: ShowTimeSlotDto) => {
    const res = await api.post("/api/pos/day-part", dto);
    return res.data;
  },
  update: async (id: number, dto: ShowTimeSlotDto) => {
    const res = await api.patch(`/api/pos/day-part/${id}`, dto);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/api/pos/day-part/${id}`);
    return res.data;
  }
};
