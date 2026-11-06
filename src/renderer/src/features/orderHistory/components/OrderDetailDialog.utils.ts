import { OrderStatus } from "@shared/types";
import type { OrderDetailProps, OrderResponseProps } from "@shared/types";

type ElectronicTicketOrder = Pick<
  OrderResponseProps,
  "eTicketUrl" | "isInvitation" | "orderStatusId"
>;

export const canExportOrderETicket = (
  order: ElectronicTicketOrder | null | undefined,
  hasExportPermission: boolean
) =>
  !!order &&
  order.orderStatusId === OrderStatus.COMPLETED &&
  hasExportPermission &&
  !order.eTicketUrl &&
  !order.isInvitation;

export const getInvitationTicketIssuerName = (order?: OrderResponseProps | null) =>
  order?.invitationTickets?.createdByStaffName?.trim() || "-";

/**
 * - `ready`: chi tiết của đúng đơn, tải xong sau khi mở dialog.
 * - `preview`: tạm hiển thị dòng danh sách hoặc cache cũ của đúng đơn trong lúc tải (hoặc khi tải
 *   lỗi, kèm `error`). Dòng danh sách không có `paperVoucher` nên chưa đủ để hiện số tiền khách trả.
 * - `loading` / `error`: chưa có dữ liệu nào của đơn này.
 * - `empty`: không có đơn để hiển thị.
 */
export type OrderDetailViewStatus = "ready" | "preview" | "loading" | "error" | "empty";

export interface OrderDetailView {
  status: OrderDetailViewStatus;
  /** Chỉ là dữ liệu của `orderId` đang mở; không bao giờ là đơn mở trước đó. */
  detail: OrderDetailProps | null;
  error: unknown;
}

interface ResolveOrderDetailViewParams {
  orderId: number;
  detail?: OrderDetailProps | null;
  /** `true` khi `detail` được tải về sau lúc mở dialog (không phải cache cũ). */
  isDetailFresh: boolean;
  /** Dòng danh sách người dùng vừa chọn (không có `paperVoucher`). */
  fallback?: OrderDetailProps | null;
  error?: unknown;
}

export const resolveOrderDetailView = ({
  orderId,
  detail,
  isDetailFresh,
  fallback,
  error = null
}: ResolveOrderDetailViewParams): OrderDetailView => {
  if (!orderId) return { status: "empty", detail: null, error: null };

  const matchedDetail = detail?.order?.id === orderId ? detail : null;

  if (matchedDetail && isDetailFresh)
    return { status: "ready", detail: matchedDetail, error: null };
  if (detail && isDetailFresh) return { status: "empty", detail: null, error: null };

  const preview = matchedDetail ?? (fallback?.order?.id === orderId ? fallback : null);

  if (preview) return { status: "preview", detail: preview, error };

  return { status: error ? "error" : "loading", detail: null, error };
};

type OrderDetailRefetchResult = {
  data?: OrderDetailProps;
  error: unknown;
  isError: boolean;
};

interface RefreshOrderDetailDataParams {
  orderId: number;
  refetch: () => Promise<OrderDetailRefetchResult>;
  invalidateOrders: () => Promise<unknown>;
}

export const refreshOrderDetailData = async ({
  orderId,
  refetch,
  invalidateOrders
}: RefreshOrderDetailDataParams) => {
  if (!orderId) return undefined;

  const result = await refetch();

  if (result.isError) {
    throw result.error;
  }

  await invalidateOrders();

  return result.data;
};
