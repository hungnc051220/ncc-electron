export interface OrderPaymentUpdatedPayload {
  orderId: string;
  orderStatus: number;
  paymentStatus: number;
  shippingStatus: number;
  transactionId: string;
  amount: number;
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
