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
