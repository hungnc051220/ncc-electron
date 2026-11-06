import { useOrderDetail } from "@renderer/hooks/orders/useOrderDetail";
import type { OrderDetailProps } from "@shared/types";
import { useState } from "react";
import { resolveOrderDetailView } from "./OrderDetailDialog.utils";

/**
 * Dữ liệu chi tiết đơn cho `OrderDetailDialog`. Luôn tải lại khi mở (bỏ qua cache 60 s mặc định:
 * trạng thái đơn/voucher có thể vừa đổi ở nơi khác) và chỉ coi là `ready` khi response của đúng
 * đơn đang mở về sau lúc mở dialog; trước đó chỉ là `preview`.
 */
export const useOrderDetailView = (orderId: number, fallback?: OrderDetailProps | null) => {
  const [openedAt] = useState(() => Date.now());
  const query = useOrderDetail(orderId, { staleTime: 0 });
  const view = resolveOrderDetailView({
    orderId,
    detail: query.data,
    isDetailFresh: !!query.data && query.dataUpdatedAt >= openedAt,
    fallback,
    error: query.error
  });

  return { ...view, isFetching: query.isFetching, refetch: query.refetch };
};
