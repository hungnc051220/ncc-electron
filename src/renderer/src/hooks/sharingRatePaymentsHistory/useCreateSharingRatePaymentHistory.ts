import { sharingRatePaymentsHistoryApi } from "@renderer/api/sharingRatePaymentsHistory.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sharingRatePaymentsHistoryKeys } from "./keys";

export const useCreateSharingRatePaymentHistory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sharingRatePaymentsHistoryApi.create,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: sharingRatePaymentsHistoryKeys.all
      });
    }
  });
};
