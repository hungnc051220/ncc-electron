import { filmCategoriesApi, FilmCategoriesQuery } from "@renderer/api/filmCategories.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

export const useFilmCategories = (params: FilmCategoriesQuery) =>
  useQuery({
    queryKey: ["film-categories"],
    queryFn: () => filmCategoriesApi.getAll(params),
    placeholderData: keepPreviousData
  });
