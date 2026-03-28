import { api } from "@renderer/api/client";
import { ApiResponse, SharingRateProps } from "@shared/types";
import queryString from "query-string";

export interface SharingRatesQuery {
  current: number;
  pageSize: number;
  filmId?: number;
}

export interface SharingRateDto {
  manufacturerId: number;
  filmId: number;
  fromDate: string;
  toDate: string;
  rate: number;
}

export const sharingRatesApi = {
  getAll: async (params: SharingRatesQuery): Promise<ApiResponse<SharingRateProps>> => {
    const { current, pageSize, filmId } = params;

    const filter: Record<string, unknown> = {};
    filter.deleted = false;

    if (filmId) {
      filter.filmId = filmId;
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

    const res = await api.get(`/api/pos/sharing-rate?${query}`);

    return res.data;
  },
  create: async (dto: { data: SharingRateDto[] }) => {
    const res = await api.post("/api/pos/sharing-rate", dto);
    return res.data;
  },
  update: async (id: number, dto: SharingRateDto) => {
    const res = await api.patch(`/api/pos/sharing-rate/${id}`, { ...dto, deleted: false });
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/api/pos/sharing-rate?id=${id}`);
    return res.data;
  },
  recalculate: async () => {
    const res = await api.delete("/api/pos/sharing-rate/recalculate");
    return res.data;
  }
};
