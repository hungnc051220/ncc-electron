export interface OrderPaymentUpdatedPayload {
  orderId: string;
  orderStatus: number;
  paymentStatus: number;
  shippingStatus: number;
  transactionId: string;
  amount: number;
  planScreenId: number;
}

export interface OrderCreatedPayload {
  id: string;
  planScreenId: number;
}

export interface SelectingChairPayload {
  planScreenId: number;
  posName: string;
  selectingChairIndexF1: string;
  selectingChairIndexF2: string;
  selectingChairIndexF3: string;
  operation: "add" | "remove";
  expiredSeconds: number;
}

export interface TicketsCancelledChairIndex {
  F1?: string[];
  F2?: string;
  F3?: string;
}

export interface TicketsCancelledPayload {
  orderIds: number[] | null;
  chairIndex: TicketsCancelledChairIndex[];
  planScreenId: number;
}
