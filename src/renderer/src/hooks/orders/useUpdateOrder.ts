import { ordersApi, OrderUpdateStatusDto } from "@renderer/api/orders.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersKeys } from "./keys";

export const useUpdateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: OrderUpdateStatusDto }) =>
      ordersApi.update(id, dto),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ordersKeys.all
      });
    }
  });
};
