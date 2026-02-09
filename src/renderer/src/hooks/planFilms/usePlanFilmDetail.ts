import { planFilmsApi } from "@renderer/api/planFilm.api";
import { useQuery } from "@tanstack/react-query";
import { planFilmsKeys } from "./keys";

export const usePlanFilmDetail = (id: number) =>
  useQuery({
    queryKey: planFilmsKeys.getDetail(id),
    queryFn: () => planFilmsApi.getDetail(id)
  });
