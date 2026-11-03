import { OrderQuoteDto, OrdersQuery } from "@renderer/api/orders.api";

export const ordersKeys = {
  all: ["orders"] as const,
  getAll: (params: OrdersQuery) => ["orders", params] as const,
  getDetail: (id: number) => ["order", id] as const,
  getOrdersByScreening: (screeningId: number) => ["order-screening", screeningId] as const,
  // Không nằm dưới `all`: invalidate đơn sau khi bán không được gọi lại báo giá của lựa chọn cũ.
  quote: (dto: OrderQuoteDto | null) => ["order-quote", dto] as const,
  paperVoucherRequest: (requestId: string) => ["order-paper-voucher-request", requestId] as const
};
