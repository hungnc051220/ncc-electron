import { usePaperVoucherBatches } from "@renderer/hooks/paperVouchers/usePaperVoucherBatches";
import { formatMoney } from "@renderer/lib/utils";
import { getVietnamBusinessDate } from "@renderer/features/vouchers/paperVouchers/paperVoucher.utils";
import {
  summarizePaperVoucherSelection,
  validatePaperVoucherSelection,
  type PaperVoucherSelectionLine
} from "@renderer/features/vouchers/paperVouchers/paperVoucherRedemption";
import type { PaperVoucherOrderQuote } from "@shared/types";
import { Button, Tag } from "antd";
import { LoaderCircle, Pencil, TicketPercent, X } from "lucide-react";

/** Báo giá backend cho đơn đang chọn; chỉ có khi bật bán vé có voucher giấy. */
export interface PaperVoucherSummaryQuote {
  quote?: PaperVoucherOrderQuote;
  isLoading: boolean;
  errorMessage?: string;
  /** Báo giá mới backend trả khi số tiền đổi lúc tạo đơn: thu ngân phải xác nhận lại. */
  isReplaced?: boolean;
  /** Tên phương thức thu phần còn lại (Tiền mặt/Quét VietQR). */
  paymentMethodLabel: string;
  onRetry: () => void;
}

interface PaperVoucherSummaryProps {
  lines: PaperVoucherSelectionLine[];
  ticketCount: number;
  quote?: PaperVoucherSummaryQuote;
  memberCardCode?: string;
  disabled?: boolean;
  onEdit: () => void;
  onClear: () => void;
}

/** Cảnh báo đã hiển thị bằng dòng riêng bên dưới, không lặp lại. */
const RENDERED_WARNING_CODES = new Set(["PAPER_VOUCHER_EXCESS", "PAPER_VOUCHER_FULLY_PAID"]);

const QuoteAmounts = ({
  quote,
  isLoading,
  errorMessage,
  isReplaced,
  paymentMethodLabel,
  onRetry
}: PaperVoucherSummaryQuote) => {
  if (isLoading) {
    return (
      <span
        data-testid="paper-voucher-quote-loading"
        className="inline-flex items-center gap-1 whitespace-nowrap text-slate-500 dark:text-stone-300"
      >
        <LoaderCircle size={13} className="animate-spin" />
        Đang tính số tiền khách cần thanh toán thêm...
      </span>
    );
  }

  if (errorMessage || !quote) {
    return (
      <span className="inline-flex items-center gap-1">
        <span
          role="alert"
          data-testid="paper-voucher-quote-error"
          className="font-medium text-red-600 dark:text-red-300"
        >
          {errorMessage}
        </span>
        <Button size="small" type="link" className="px-1" onClick={onRetry}>
          Thử lại
        </Button>
      </span>
    );
  }

  const isFullyPaid = quote.remainingPayable === 0;

  return (
    <>
      <span className="whitespace-nowrap">
        Tổng tiền vé:{" "}
        <b data-testid="paper-voucher-order-total" className="tabular-nums">
          {formatMoney(quote.orderTotal)}
        </b>
      </span>
      <span className="whitespace-nowrap">
        Thanh toán bằng Voucher giấy:{" "}
        <b
          data-testid="paper-voucher-applied"
          className="tabular-nums text-emerald-700 dark:text-emerald-300"
        >
          {formatMoney(quote.voucherApplied)}
        </b>
      </span>
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        Cần thanh toán thêm:{" "}
        <b
          data-testid="paper-voucher-remaining"
          className="text-sm tabular-nums text-primary dark:text-indigo-300"
        >
          {formatMoney(quote.remainingPayable)}
        </b>
        {isFullyPaid ? (
          <Tag color="success" variant="outlined" className="m-0">
            Voucher giấy đã thanh toán đủ
          </Tag>
        ) : (
          <span data-testid="paper-voucher-payment-method">({paymentMethodLabel})</span>
        )}
      </span>
      {quote.excessAmount > 0 && (
        <span
          data-testid="paper-voucher-excess-warning"
          className="whitespace-nowrap font-medium text-amber-700 dark:text-amber-200"
        >
          Tiền thừa voucher{" "}
          <b data-testid="paper-voucher-excess" className="tabular-nums">
            {formatMoney(quote.excessAmount)}
          </b>{" "}
          không hoàn lại
        </span>
      )}
      {isReplaced && (
        <Tag data-testid="paper-voucher-quote-replaced" color="warning" className="m-0">
          Số tiền vừa thay đổi, kiểm tra lại trước khi In vé
        </Tag>
      )}
      {quote.warnings
        .filter((warning) => !RENDERED_WARNING_CODES.has(warning.code))
        .map((warning) => (
          <span
            key={warning.code}
            data-testid="paper-voucher-quote-warning"
            className="font-medium text-amber-700 dark:text-amber-200"
          >
            {warning.message}
          </span>
        ))}
    </>
  );
};

const PaperVoucherSummary = ({
  lines,
  ticketCount,
  quote,
  memberCardCode,
  disabled = false,
  onEdit,
  onClear
}: PaperVoucherSummaryProps) => {
  const { data: batches = [] } = usePaperVoucherBatches();

  const batchesById = new Map(batches.map((batch) => [batch.id, batch]));
  const errors = validatePaperVoucherSelection({
    lines,
    batches,
    ticketCount,
    today: getVietnamBusinessDate()
  });
  const { faceValueTotal } = summarizePaperVoucherSelection(lines);

  return (
    <div
      data-testid="paper-voucher-pos-summary"
      className="mx-2 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-md border border-amber-300/70 bg-amber-50 px-3 py-1.5 text-xs text-slate-800 dark:border-amber-200/25 dark:bg-amber-400/10 dark:text-stone-100"
    >
      <div className="flex items-center gap-2">
        <TicketPercent size={16} className="text-amber-600 dark:text-amber-300" />
        <span className="font-semibold">Voucher giấy</span>
        <Tag color="warning" variant="outlined" className="m-0">
          {quote ? "Tương đương tiền mặt" : "Chưa ghi nhận vào đơn"}
        </Tag>
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
        {lines.map((line) => (
          <span key={line.batchId} className="whitespace-nowrap">
            {batchesById.get(line.batchId)?.batchCode ?? `Lô #${line.batchId}`} ·{" "}
            {formatMoney(line.faceValue)} × {line.quantity}
          </span>
        ))}
        {memberCardCode && <span className="whitespace-nowrap">Thẻ {memberCardCode}</span>}
        <span className="whitespace-nowrap">
          Tổng mệnh giá{" "}
          <b data-testid="paper-voucher-face-value-total" className="tabular-nums">
            {formatMoney(quote?.quote?.faceValueTotal ?? faceValueTotal)}
          </b>
        </span>
        {quote && <QuoteAmounts {...quote} />}
        {errors.length > 0 && (
          <span
            role="alert"
            data-testid="paper-voucher-selection-error"
            className="font-medium text-red-600 dark:text-red-300"
          >
            {errors[0]}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <Button size="small" icon={<Pencil size={14} />} disabled={disabled} onClick={onEdit}>
          Sửa
        </Button>
        <Button size="small" icon={<X size={14} />} disabled={disabled} onClick={onClear}>
          Bỏ áp dụng
        </Button>
      </div>
    </div>
  );
};

export default PaperVoucherSummary;
