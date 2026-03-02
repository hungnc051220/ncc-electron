export interface OrderPaymentUpdatedPayload {
  orderId: string;
  orderStatus: number;
  paymentStatus: number;
  shippingStatus: number;
  transactionId: string;
  amount: number;
}
