import { ordersApi } from "@renderer/api/orders.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersKeys } from "./keys";

export const useUpdateRefundStatusOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: Parameters<typeof ordersApi.updateRefundStatus>[0]) =>
      ordersApi.updateRefundStatus(params),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ordersKeys.all
      });
    }
  });
};
