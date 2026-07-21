import type { OrderDetailProps, OrderResponseProps } from "@shared/types";

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
