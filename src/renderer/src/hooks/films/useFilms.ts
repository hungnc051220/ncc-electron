import { filmsApi, FilmsQuery } from "@renderer/api/films.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { filmsKey } from "./keys";

export const useFilms = (params: FilmsQuery) =>
  useQuery({
    queryKey: filmsKey.getAll(params),
    queryFn: () => filmsApi.getAll(params),
    placeholderData: keepPreviousData
  });
