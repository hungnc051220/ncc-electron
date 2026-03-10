import { ordersApi, SelectingChairsDto } from "@renderer/api/orders.api";
import { useMutation } from "@tanstack/react-query";

export const useSelectingChairs = () => {
  return useMutation({
    mutationFn: ({ operation, dto }: { operation: "add" | "remove"; dto: SelectingChairsDto }) =>
      ordersApi.selectingChairs(operation, dto)
  });
};
