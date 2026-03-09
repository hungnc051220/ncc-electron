import { ordersApi } from "@renderer/api/orders.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ordersKeys } from "./keys";

export const useOrdersByScreening = (screeningId: number) =>
  useQuery({
    queryKey: ordersKeys.getOrdersByScreening(screeningId),
    queryFn: () => ordersApi.getByScreens(screeningId),
    placeholderData: keepPreviousData
  });
