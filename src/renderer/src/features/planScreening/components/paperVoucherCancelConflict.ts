import { getApiErrorCode, getApiErrorStatus } from "@renderer/lib/apiError";
import { resolveOrderPaymentStatus } from "@renderer/lib/utils";
import { OrderResponseProps, OrderStatus, PaymentStatus } from "@shared/types";
import { PAPER_VOUCHER_QR_ERROR_CODES } from "./paperVoucherSale";

const CANCEL_CONFLICT_CODES: readonly string[] = [
  PAPER_VOUCHER_QR_ERROR_CODES.qrPaymentReceived,
  PAPER_VOUCHER_QR_ERROR_CODES.orderLocked
];

/**
 * O-8: lệnh hủy bị backend từ chối (409) vì đơn đã đổi trạng thái so với lúc thu ngân bắt đầu hủy (vừa được
 * thanh toán, đã nhận tiền QR, đã bị hủy / kết thúc). Backend không hủy gì; app không gửi lại.
 */
export const isOrderCancelConflict = (error: unknown) =>
  getApiErrorStatus(error) === 409 && CANCEL_CONFLICT_CODES.includes(getApiErrorCode(error) ?? "");

type CancelConflictOrder = Pick<
  OrderResponseProps,
  "orderStatusId" | "paymentStatusId" | "orderPaymentTransactions"
>;

/** Thông báo theo trạng thái đơn vừa tải lại; không tải được thì dùng câu của backend. */
export const getOrderCancelConflictMessage = ({
  orderId,
  order,
  fallback
}: {
  orderId: number;
  order?: CancelConflictOrder | null;
  fallback: string;
}) => {
  if (!order) return fallback;
  if (order.orderStatusId === OrderStatus.COMPLETED) {
    return `Đơn #${orderId} đã được thanh toán trong lúc bạn thao tác hủy nên chưa bị hủy. Xem hoặc in lại vé ở Lịch sử bán vé. Nếu vẫn cần hủy đơn đã thanh toán, hãy chọn lại đơn và hủy lại.`;
  }
  if (order.orderStatusId === OrderStatus.FAIL) {
    return `Đơn #${orderId} đã được hủy hoặc kết thúc trước đó, không hủy lại.`;
  }
  if (
    order.orderStatusId === OrderStatus.PENDING &&
    resolveOrderPaymentStatus(order) === PaymentStatus.PAID
  ) {
    return `Đơn #${orderId} đã nhận tiền QR và đang chờ hệ thống hoàn tất nên chưa bị hủy. Kiểm tra lại đơn ở Lịch sử bán vé sau ít phút.`;
  }
  return fallback;
};
