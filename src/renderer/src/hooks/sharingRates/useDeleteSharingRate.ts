import { sharingRatesApi } from "@renderer/api/sharingRates.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reportsKeys } from "../reports/keys";
import { sharingRatesKeys } from "./keys";

export const useDeleteSharingRate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sharingRatesApi.delete,

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
