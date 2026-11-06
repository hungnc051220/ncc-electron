import { formatMoney } from "@renderer/lib/utils";
import type {
  OrderPaperVoucherDetail,
  OrderPaperVoucherLineStatus,
  PaperVoucherRedemptionStatus
} from "@shared/types";

export type PaperVoucherPaymentRowTone = "default" | "voucher" | "paid" | "warning";

export interface PaperVoucherPaymentRow {
  key: "orderTotal" | "voucherApplied" | "paidByCustomer" | "excess";
  label: string;
  value: string;
  tone: PaperVoucherPaymentRowTone;
}

interface StatusDisplay {
  label: string;
  color: string;
}

export const PAPER_VOUCHER_PAYMENT_LABELS = {
  orderTotal: "Giá vé trước voucher",
  voucherApplied: "Voucher giấy đã áp dụng",
  paidByCustomer: "Tiền khách thực trả",
  excess: "Tiền thừa voucher"
} as const;

export const PAPER_VOUCHER_STATUS_DISPLAY: Record<PaperVoucherRedemptionStatus, StatusDisplay> = {
  held: { label: "Đang giữ, chờ thanh toán QR", color: "processing" },
  applied: { label: "Đã sử dụng", color: "success" },
  released: { label: "Đã trả lại lô", color: "default" },
  cancelled: { label: "Đã hủy theo đơn", color: "error" }
};

export const PAPER_VOUCHER_LINE_STATUS_DISPLAY: Record<OrderPaperVoucherLineStatus, StatusDisplay> =
  {
    applied: { label: "Đã áp dụng", color: "success" },
    reversed: { label: "Đã trả lại lô", color: "default" },
    cancelled: { label: "Đã hủy, không dùng lại", color: "error" }
  };

/**
 * Các dòng thanh toán của đơn có voucher giấy. Voucher là nguồn thanh toán, không phải giảm giá:
 * giá vé trước voucher = `orderTotal` của đơn = voucher đã áp dụng + phần khách trả thêm.
 */
export const buildPaperVoucherPaymentRows = (
  paperVoucher: OrderPaperVoucherDetail
): PaperVoucherPaymentRow[] => {
  const rows: PaperVoucherPaymentRow[] = [
    {
      key: "orderTotal",
      label: PAPER_VOUCHER_PAYMENT_LABELS.orderTotal,
      value: formatMoney(paperVoucher.orderTotal),
      tone: "default"
    },
    {
      key: "voucherApplied",
      label: PAPER_VOUCHER_PAYMENT_LABELS.voucherApplied,
      value: `-${formatMoney(paperVoucher.voucherApplied)}`,
      tone: "voucher"
    },
    {
      key: "paidByCustomer",
      label: PAPER_VOUCHER_PAYMENT_LABELS.paidByCustomer,
      // Số khách đã trả thêm ngoài voucher (backend ghi `collectedAmount`).
      value: formatMoney(paperVoucher.collectedAmount ?? 0),
      tone: "paid"
    }
  ];

  if (paperVoucher.excessAmount <= 0) return rows;

  return [
    ...rows,
    {
      key: "excess",
      label: PAPER_VOUCHER_PAYMENT_LABELS.excess,
      value: formatMoney(paperVoucher.excessAmount),
      tone: "warning"
    }
  ];
};
