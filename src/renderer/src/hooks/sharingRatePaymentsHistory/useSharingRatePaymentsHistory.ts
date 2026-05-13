import {
  sharingRatePaymentsHistoryApi,
  SharingRatePaymentsHistoryQuery
} from "@renderer/api/sharingRatePaymentsHistory.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { sharingRatePaymentsHistoryKeys } from "./keys";

export const useSharingRatePaymentsHistory = (
  params: SharingRatePaymentsHistoryQuery,
  enabled = true
) =>
  useQuery({
    queryKey: sharingRatePaymentsHistoryKeys.getAll(params),
    queryFn: () => sharingRatePaymentsHistoryApi.getAll(params),
    enabled,
    placeholderData: keepPreviousData
  });
