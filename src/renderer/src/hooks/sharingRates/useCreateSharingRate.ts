import { sharingRatesApi } from "@renderer/api/sharingRates.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sharingRatesKeys } from "./keys";

export const useCreateSharingRate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sharingRatesApi.create,

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
