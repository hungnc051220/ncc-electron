import { SharingRateDto, sharingRatesApi } from "@renderer/api/sharingRates.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reportsKeys } from "../reports/keys";
import { sharingRatesKeys } from "./keys";

export const useUpdateSharingRate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: SharingRateDto }) =>
      sharingRatesApi.update(id, dto),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: sharingRatesKeys.all
      });
      queryClient.invalidateQueries({
        queryKey: reportsKeys.getReportRevenueSharing()
      });
    }
  });
};
