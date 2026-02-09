import { api } from "@renderer/api/client";
import { ApiResponse, ManufacturerProps } from "@renderer/types";
import queryString from "query-string";

export interface ManufacturersQuery {
  current: number;
  pageSize: number;
}

export interface ManufacturerDto {
  id?: number;
  name: string;
  fullName: string;
  manufacturerTemplateId?: number;
  bankName?: string;
  phoneNumber?: string;
  acountBank?: string;
  addressBank?: string;
  address?: string;
  fax?: string;
  url?: string;
}

export const manufacturersApi = {
  getAll: async (params: ManufacturersQuery): Promise<ApiResponse<ManufacturerProps>> => {
    const { current, pageSize } = params;

    const filter: Record<string, unknown> = {};

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

    const res = await api.get(`/api/pos/manufacturer?${query}`);

    return res.data;
  },
  create: async (dto: ManufacturerDto) => {
    const res = await api.post("/api/pos/manufacturer", dto);
    return res.data;
  },
  update: async (id: number, dto: ManufacturerDto) => {
    const res = await api.patch(`/api/pos/manufacturer/${id}`, dto);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/api/pos/manufacturer/${id}`);
    return res.data;
  }
};
