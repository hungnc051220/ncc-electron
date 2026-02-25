import { planFilmsApi, PlanFilmsQuery } from "@renderer/api/planFilm.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { planFilmsKeys } from "./keys";

export const usePlanFilms = (params: PlanFilmsQuery) =>
  useQuery({
    queryKey: planFilmsKeys.getAll(params),
    queryFn: () => planFilmsApi.getAll(params),
    placeholderData: keepPreviousData,
    enabled: !!params.planCinemaId
  });
