import {
  SharingRatePaymentHistoryDto,
  sharingRatePaymentsHistoryApi
} from "@renderer/api/sharingRatePaymentsHistory.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sharingRatePaymentsHistoryKeys } from "./keys";

export const useUpdateSharingRatePaymentHistory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: SharingRatePaymentHistoryDto }) =>
      sharingRatePaymentsHistoryApi.update(id, dto),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: sharingRatePaymentsHistoryKeys.all
      });
    }
  });
};
