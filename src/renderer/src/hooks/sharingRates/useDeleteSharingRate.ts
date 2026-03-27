import { sharingRatesApi } from "@renderer/api/sharingRates.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sharingRatesKeys } from "./keys";

export const useDeleteSharingRate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sharingRatesApi.delete,

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: sharingRatesKeys.all
        }),
        queryClient.invalidateQueries({
          queryKey: ["report-sharing"]
        })
      ]);
    }
  });
};
