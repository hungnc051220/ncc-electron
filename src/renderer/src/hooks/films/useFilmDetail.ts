import { filmsApi } from "@renderer/api/films.api";
import { useQuery } from "@tanstack/react-query";
import { filmsKey } from "./keys";

export const useFilmDetail = (id: number) =>
  useQuery({
    queryKey: filmsKey.getDetail(id),
    queryFn: () => filmsApi.getDetail(id),
    enabled: !!id
  });
