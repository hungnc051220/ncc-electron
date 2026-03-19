import { sharingRatesApi } from "@renderer/api/sharingRates.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sharingRatesKeys } from "./keys";
import { reportsKeys } from "../reports/keys";

export const useCreateSharingRate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sharingRatesApi.create,

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
