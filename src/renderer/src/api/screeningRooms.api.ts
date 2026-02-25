import { api } from "@renderer/api/client";
import { ApiResponse, RoomProps } from "@shared/types";
import queryString from "query-string";

export interface ScreeningRoomsQuery {
  current: number;
  pageSize: number;
}

export interface ScreeningRoomDto {
  id?: number;
  name: string;
  numberOfFloor: number;
  ruleOrder: string;
}

export const screeningRoomsApi = {
  getAll: async (params: ScreeningRoomsQuery): Promise<ApiResponse<RoomProps>> => {
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

    const res = await api.get(`/api/pos/rooms?${query}`);

    return res.data;
  },
  create: async (dto: ScreeningRoomDto) => {
    const res = await api.post("/api/pos/rooms", dto);
    return res.data;
  },
  update: async (id: number, dto: ScreeningRoomDto) => {
    const res = await api.patch(`/api/pos/rooms/${id}`, dto);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/api/pos/rooms/${id}`);
    return res.data;
  }
};
