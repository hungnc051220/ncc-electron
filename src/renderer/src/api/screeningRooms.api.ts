import { api } from "@renderer/api/client";
import { ApiResponse, ChairProps, RoomProps } from "@shared/types";
import queryString from "query-string";

export interface ScreeningRoomsQuery {
  current: number;
  pageSize: number;
  id?: number;
  hidden?: boolean;
}

export interface ScreeningRoomChairsQuery {
  current: number;
  pageSize: number;
  roomId?: number;
}

export interface ScreeningRoomDto {
  id?: number;
  name: string;
  numberOfFloor: number;
  ruleOrder: string;
  hidden?: boolean;
}

export interface CreateChairsDto {
  roomId: number;
  positionId: number;
  versionCode: string;
  listChairF1: string;
  listChairF2: string;
  listChairF3: string;
  quantityF1: number;
  quantityF2: number;
  quantityF3: number;
}

export const screeningRoomsApi = {
  getAll: async (params: ScreeningRoomsQuery): Promise<ApiResponse<RoomProps>> => {
    const { current, pageSize, id, hidden } = params;

    const filter: Record<string, unknown> = {};

    if (id) {
      filter.id = id;
    }

    if (hidden !== undefined) {
      filter.hidden = hidden;
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

    const res = await api.get(`/api/pos/rooms?${query}`);

    return res.data;
  },
  getChairs: async (params: ScreeningRoomChairsQuery): Promise<ApiResponse<ChairProps>> => {
    const { current, pageSize, roomId } = params;

    const filter: Record<string, unknown> = {};

    if (roomId) {
      filter.roomId = roomId;
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

    const res = await api.get(`/api/pos/chairs?${query}`);

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
  },
  createChairs: async (dto: CreateChairsDto[]) => {
    const res = await api.post("/api/pos/chairs", dto);
    return res.data;
  }
};
