import { filmsApi } from "@renderer/api/films.api";
import { UsersQuery } from "@renderer/api/users.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { filmsKey } from "./keys";

export const useFilms = (params: UsersQuery) =>
  useQuery({
    queryKey: filmsKey.getAll(params),
    queryFn: () => filmsApi.getAll(params),
    placeholderData: keepPreviousData
  });
