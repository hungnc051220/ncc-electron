import { planFilmsApi, PlanFilmsQuery } from "@renderer/api/planFilm.api";
import { useQuery } from "@tanstack/react-query";
import { planFilmsKeys } from "./keys";

export const usePlanFilms = (params: PlanFilmsQuery) =>
  useQuery({
    queryKey: planFilmsKeys.getAll(params),
    queryFn: () => planFilmsApi.getAll(params),
    enabled: !!params.planCinemaId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always"
  });
