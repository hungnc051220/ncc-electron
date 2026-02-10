import { discountsApi } from "@renderer/api/discounts.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { discountsKeys } from "./keys";

export const useDeleteDiscount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: discountsApi.delete,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: discountsKeys.all
      });
    }
  });
};
