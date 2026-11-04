import { ordersApi } from "@renderer/api/orders.api";
import { useQuery } from "@tanstack/react-query";
import { ordersKeys } from "./keys";

interface UseOrderDetailOptions {
  /** Ghi đè `staleTime` mặc định (60 s) cho riêng observer này, vd. `0` để luôn tải lại khi mở. */
  staleTime?: number;
}

export const useOrderDetail = (id: number, options: UseOrderDetailOptions = {}) =>
  useQuery({
    queryKey: ordersKeys.getDetail(id),
    queryFn: () => ordersApi.getDetail(id),
    enabled: !!id,
    ...options
  });
