import { planCinemasApi, PlanCinemasQuery } from "@renderer/api/planCinemas.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { planCinemasKeys } from "./keys";

export const usePlanCinemas = (params: PlanCinemasQuery) =>
  useQuery({
    queryKey: planCinemasKeys.getAll(params),
    queryFn: () => planCinemasApi.getAll(params),
    placeholderData: keepPreviousData
  });
