import { ordersApi } from "@renderer/api/orders.api";
import { useQuery } from "@tanstack/react-query";
import { ordersKeys } from "./keys";

export const useOrderDetail = (id: number) =>
  useQuery({
    queryKey: ordersKeys.getDetail(id),
    queryFn: () => ordersApi.getDetail(id)
  });
