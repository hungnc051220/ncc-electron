import { FilmCategoriesQuery } from "@renderer/api/filmCategories.api";

export const filmCategoriesKeys = {
  all: ["film-categories"] as const,
  getAll: (params: FilmCategoriesQuery) => ["film-categories", params] as const
};
