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

const QuoteAmounts = ({ quote, isLoading, errorMessage, onRetry }: PaperVoucherSummaryQuote) => {
  if (isLoading) {
    return (
      <span
        data-testid="paper-voucher-quote-loading"
        className="inline-flex items-center gap-1 whitespace-nowrap text-slate-500 dark:text-stone-300"
      >
        <LoaderCircle size={13} className="animate-spin" />
        Đang tính số tiền khách cần trả...
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

  const { paperVoucher } = quote;

  return (
    <>
      <span className="whitespace-nowrap">
        Tổng mệnh giá <b className="tabular-nums">{formatMoney(paperVoucher.faceValueTotal)}</b>
      </span>
      <span className="whitespace-nowrap">
        Tiền đơn{" "}
        <b data-testid="paper-voucher-base-total" className="tabular-nums">
          {formatMoney(quote.baseTotal)}
        </b>
      </span>
      <span className="whitespace-nowrap">
        Voucher áp dụng{" "}
        <b
          data-testid="paper-voucher-applied"
          className="tabular-nums text-emerald-700 dark:text-emerald-300"
        >
          −{formatMoney(paperVoucher.voucherApplied)}
        </b>
      </span>
      {paperVoucher.excessAmount > 0 && (
        <span className="whitespace-nowrap text-amber-700 dark:text-amber-200">
          Vượt giá trị đơn{" "}
          <b data-testid="paper-voucher-excess" className="tabular-nums">
            {formatMoney(paperVoucher.excessAmount)}
          </b>{" "}
          (không hoàn lại)
        </span>
      )}
      <span className="whitespace-nowrap">
        Khách cần trả{" "}
        <b
          data-testid="paper-voucher-final-total"
          className="text-sm tabular-nums text-primary dark:text-indigo-300"
        >
          {formatMoney(quote.finalOrderTotal)}
        </b>
      </span>
      {quote.warnings.map((warning) => (
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
          {quote ? "Chỉ thanh toán tiền mặt" : "Chưa ghi nhận vào đơn"}
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
        {quote ? (
          <QuoteAmounts {...quote} />
        ) : (
          <span className="whitespace-nowrap">
            Tổng mệnh giá <b className="tabular-nums">{formatMoney(faceValueTotal)}</b>
          </span>
        )}
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
