import { planScreeningsApi, PlanScreeningsQuery } from "@renderer/api/planScreenings.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { planScreeningsKeys } from "./keys";

export const usePlanScreenings = (params: PlanScreeningsQuery) =>
  useQuery({
    queryKey: planScreeningsKeys.getAll(params),
    queryFn: () => planScreeningsApi.getAll(params),
    placeholderData: keepPreviousData
  });
