import { ordersApi, OrdersQuery } from "@renderer/api/orders.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ordersKeys } from "./keys";

export const useOrders = (params: OrdersQuery) =>
  useQuery({
    queryKey: ordersKeys.getAll(params),
    queryFn: () => ordersApi.getAll(params),
    placeholderData: keepPreviousData
  });
