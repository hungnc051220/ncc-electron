import { api } from "@renderer/api/client";
import { ApiResponse, SeatTypeProps } from "@renderer/types";
import queryString from "query-string";

export interface SeatTypesQuery {
  current: number;
  pageSize: number;
}

export interface SeatTypeDto {
  id?: number;
  positionCode: string;
  name: string;
  isSeat: boolean;
  isDefault: boolean;
  color?: string;
  pictureUrl?: string;
}

export const seatTypesApi = {
  getAll: async (params: SeatTypesQuery): Promise<ApiResponse<SeatTypeProps>> => {
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

    const res = await api.get(`/api/pos/position?${query}`);

    return res.data;
  },
  getDetail: async (id: number): Promise<SeatTypeProps> => {
    const res = await api.get(`/api/pos/position/${id}`);
    return res.data;
  },
  create: async (dto: SeatTypeDto) => {
    const res = await api.post("/api/pos/position", { ...dto, deleted: false });
    return res.data;
  },
  update: async (id: number, dto: SeatTypeDto) => {
    const res = await api.patch(`/api/pos/position/${id}`, dto);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/api/pos/position/${id}`);
    return res.data;
  }
};
