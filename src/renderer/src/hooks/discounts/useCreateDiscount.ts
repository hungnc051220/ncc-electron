import { discountsApi } from "@renderer/api/discounts.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { discountsKeys } from "./keys";

export const useCreateDiscount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: discountsApi.create,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: discountsKeys.all
      });
    }
  });
};
