import { api } from "@renderer/api/client";
import { ApiResponse, FilmCategoryProps } from "@shared/types";
import queryString from "query-string";

export interface FilmCategoriesQuery {
  current: number;
  pageSize: number;
  name?: string;
  published?: boolean;
  sort?: string;
}

export interface FilmCategoryDto {
  name: string;
  description: string;
  published: boolean;
}

export const filmCategoriesApi = {
  getAll: async (params: FilmCategoriesQuery): Promise<ApiResponse<FilmCategoryProps>> => {
    const { current, pageSize, name, published, sort } = params;

    const filter: Record<string, unknown> = {};
    filter.deleted = false;

    if (name) {
      filter.name = { like: `%${name}%` };
    }

    if (published !== undefined) {
      filter.published = published;
    }

    const queryObject: Record<string, unknown> = {
      current,
      pageSize,
      sort: sort || "createdOnUtc.desc"
    };

    if (Object.keys(filter).length > 0) {
      queryObject.filter = JSON.stringify(filter);
    }
    const query = queryString.stringify(queryObject, {
      skipEmptyString: true,
      skipNull: true
    });

    const res = await api.get(`/api/pos/category?${query}`);
    return res.data;
  },
  create: async (dto: FilmCategoryDto) => {
    const res = await api.post("/api/pos/category", { ...dto, pictureId: 1 });
    return res.data;
  },
  update: async (id: number, dto: FilmCategoryDto) => {
    const res = await api.patch(`/api/pos/category/${id}`, { ...dto, pictureId: 1 });
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/api/pos/category/${id}`);
    return res.data;
  }
};
