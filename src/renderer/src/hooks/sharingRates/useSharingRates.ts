import { sharingRatesApi, SharingRatesQuery } from "@renderer/api/sharingRates.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { sharingRatesKeys } from "./keys";

export const useSharingRates = (params: SharingRatesQuery, enabled = true) =>
  useQuery({
    queryKey: sharingRatesKeys.getAll(params),
    queryFn: () => sharingRatesApi.getAll(params),
    enabled,
    placeholderData: keepPreviousData
  });
