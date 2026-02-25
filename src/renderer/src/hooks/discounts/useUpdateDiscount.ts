import { DiscountDto, discountsApi } from "@renderer/api/discounts.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { discountsKeys } from "./keys";

export const useUpdateDiscount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: DiscountDto }) => discountsApi.update(id, dto),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: discountsKeys.all
      });
    }
  });
};
