import { api } from "@renderer/api/client";
import { ApiResponse, FilmCategoryProps } from "@shared/types";
import queryString from "query-string";

export interface FilmCategoriesQuery {
  current: number;
  pageSize: number;
}

export const filmCategoriesApi = {
  getAll: async (params: FilmCategoriesQuery): Promise<ApiResponse<FilmCategoryProps>> => {
    const query = queryString.stringify(params, {
      skipEmptyString: true,
      skipNull: true
    });

    const res = await api.get(`/api/pos/v1/films/categories?${query}`);
    return res.data;
  }
};
