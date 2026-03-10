import { planScreeningsApi } from "@renderer/api/planScreenings.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { planScreeningsKeys } from "./keys";

export const usePlanScreeningsAvailableDates = (fromDate: string, toDate: string) =>
  useQuery({
    queryKey: planScreeningsKeys.getAvailableDates(fromDate, toDate),
    queryFn: () => planScreeningsApi.getAvailableDates(fromDate, toDate),
    placeholderData: keepPreviousData,
    enabled: !!fromDate && !!toDate
  });
