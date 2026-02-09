import { planScreeningsApi } from "@renderer/api/planScreenings.api";
import { useQuery } from "@tanstack/react-query";
import { planScreeningsKeys } from "./keys";

export const usePlanScreeningsByDate = (date: string) =>
  useQuery({
    queryKey: planScreeningsKeys.getByDate(date),
    queryFn: () => planScreeningsApi.getByDate(date)
  });
