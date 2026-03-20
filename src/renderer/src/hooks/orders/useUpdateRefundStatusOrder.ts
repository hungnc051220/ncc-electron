import { ordersApi, OrderUpdateRefundStatusDto } from "@renderer/api/orders.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersKeys } from "./keys";

export const useUpdateRefundStatusOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: OrderUpdateRefundStatusDto }) =>
      ordersApi.updateRefundStatus(id, dto),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ordersKeys.all
      });
    }
  });
};
