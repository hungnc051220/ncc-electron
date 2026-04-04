import { FilmCategoriesQuery, filmCategoriesApi } from "@renderer/api/filmCategories.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { filmCategoriesKeys } from "./keys";

export const useFilmCategories = (params: FilmCategoriesQuery) =>
  useQuery({
    queryKey: filmCategoriesKeys.getAll(params),
    queryFn: () => filmCategoriesApi.getAll(params),
    placeholderData: keepPreviousData
  });
