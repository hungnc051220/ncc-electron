import { ordersApi } from "@renderer/api/orders.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersKeys } from "./keys";

export const useUnmarkPrintedOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ordersApi.unmarkPrinted,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ordersKeys.all
      });
    }
  });
};
