export interface OrderPaymentUpdatedPayload {
  orderId: number;
  status: "PENDING" | "PAID" | "FAILED";
  paymentMethod: "QR" | "CASH" | "CARD";
  amount: number;
  paidAt?: string;
}
