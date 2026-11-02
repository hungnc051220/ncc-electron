import {
  isPaperVoucherMockMode,
  PAPER_VOUCHER_POS_UNAVAILABLE_MESSAGE
} from "@renderer/api/paperVouchers.api";
import { useSimulatePaperVoucherRedemption } from "@renderer/hooks/paperVouchers/usePaperVoucherBatchMutations";
import { usePaperVoucherBatches } from "@renderer/hooks/paperVouchers/usePaperVoucherBatches";
import { useAntdApp } from "@renderer/hooks/useAntdApp";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { formatMoney, formatNumber } from "@renderer/lib/utils";
import { getVietnamBusinessDate } from "@renderer/features/vouchers/paperVouchers/paperVoucher.utils";
import {
  calculatePaperVoucherPreview,
  createMockPaperVoucherTransactionId,
  validatePaperVoucherSelection,
  type PaperVoucherSelectionLine
} from "@renderer/features/vouchers/paperVouchers/paperVoucherRedemption";
import { Button, Tag, Tooltip } from "antd";
import { CircleCheck, Pencil, TicketPercent, X } from "lucide-react";
import { useRef } from "react";

interface PaperVoucherSummaryProps {
  lines: PaperVoucherSelectionLine[];
  ticketCount: number;
  eligibleAmount: number;
  staffName?: string | null;
  canSimulate: boolean;
  disabled?: boolean;
  onEdit: () => void;
  onClear: () => void;
}

const PaperVoucherSummary = ({
  lines,
  ticketCount,
  eligibleAmount,
  staffName,
  canSimulate,
  disabled = false,
  onEdit,
  onClear
}: PaperVoucherSummaryProps) => {
  const { message, modal } = useAntdApp();
  const isMock = isPaperVoucherMockMode();
  const { data: batches = [] } = usePaperVoucherBatches();
  const simulateRedemption = useSimulatePaperVoucherRedemption();
  // Giữ cùng một mã cho một lần xác nhận để không ghi nhận trùng khi bấm lặp/thử lại.
  const transactionIdRef = useRef<string | null>(null);

  const batchesById = new Map(batches.map((batch) => [batch.id, batch]));
  const errors = validatePaperVoucherSelection({
    lines,
    batches,
    ticketCount,
    today: getVietnamBusinessDate()
  });
  const preview = calculatePaperVoucherPreview({ lines, eligibleAmount });
  const isBusy = disabled || simulateRedemption.isPending;

  const handleSimulate = () => {
    // Dữ liệu thật: không có API ghi nhận sử dụng, không được cộng UsedCount từ máy POS.
    if (!isMock) {
      message.error(PAPER_VOUCHER_POS_UNAVAILABLE_MESSAGE);
      return;
    }
    if (!canSimulate) {
      message.error("Bạn không có quyền bán vé");
      return;
    }
    if (errors.length) {
      message.error(errors[0]);
      return;
    }

    transactionIdRef.current ??= createMockPaperVoucherTransactionId();
    const transactionId = transactionIdRef.current;

    modal.confirm({
      title: "Xác nhận giao dịch mô phỏng",
      content: (
        <div className="flex flex-col gap-1">
          <p className="m-0">
            Ghi nhận {formatNumber(preview.voucherCount)} voucher giấy vào dữ liệu mẫu. Không tạo
            đơn hàng, không giữ ghế và không in vé.
          </p>
          <p className="m-0 text-xs text-slate-500 dark:text-slate-400">
            Mã giao dịch mô phỏng: {transactionId}
          </p>
        </div>
      ),
      okText: "Ghi nhận mô phỏng",
      cancelText: "Quay lại",
      onOk: () =>
        simulateRedemption
          .mutateAsync({
            transactionId,
            lines,
            ticketCount,
            eligibleAmount,
            staffName
          })
          .then(() => {
            transactionIdRef.current = null;
            message.success(
              `Đã mô phỏng hoàn tất: ghi nhận ${formatNumber(preview.voucherCount)} voucher giấy trên dữ liệu mẫu (chưa lưu lên hệ thống)`
            );
            onClear();
          })
          .catch((error: unknown) => {
            message.error(getApiErrorMessage(error, "Mô phỏng sử dụng voucher giấy thất bại"));
          })
    });
  };

  return (
    <div
      data-testid="paper-voucher-pos-summary"
      className="mx-2 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-md border border-amber-300/70 bg-amber-50 px-3 py-1.5 text-xs text-slate-800 dark:border-amber-200/25 dark:bg-amber-400/10 dark:text-stone-100"
    >
      <div className="flex items-center gap-2">
        <TicketPercent size={16} className="text-amber-600 dark:text-amber-300" />
        <span className="font-semibold">Voucher giấy</span>
        <Tag color="warning" variant="outlined" className="m-0">
          {isMock ? "Dữ liệu mẫu" : "Chưa ghi nhận vào đơn"}
        </Tag>
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
        {lines.map((line) => (
          <span key={line.batchId} className="whitespace-nowrap">
            {batchesById.get(line.batchId)?.batchCode ?? `Lô #${line.batchId}`} ·{" "}
            {formatMoney(line.faceValue)} × {line.quantity}
          </span>
        ))}
        <span className="whitespace-nowrap">
          Tổng mệnh giá <b className="tabular-nums">{formatMoney(preview.faceValueTotal)}</b>
        </span>
        <span className="whitespace-nowrap">
          Còn thanh toán dự kiến{" "}
          <b className="tabular-nums text-primary dark:text-indigo-300">
            {formatMoney(preview.payableAmount)}
          </b>
        </span>
        {errors.length > 0 && (
          <span role="alert" className="font-medium text-red-600 dark:text-red-300">
            {errors[0]}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <Button size="small" icon={<Pencil size={14} />} disabled={isBusy} onClick={onEdit}>
          Sửa
        </Button>
        <Button size="small" icon={<X size={14} />} disabled={isBusy} onClick={onClear}>
          Bỏ áp dụng
        </Button>
        {/* Dữ liệu thật: không có API ghi nhận sử dụng nên không có thao tác hoàn tất. */}
        {isMock && (
          <Tooltip title="Chỉ ghi nhận vào dữ liệu mẫu; không tạo đơn, không in vé">
            <Button
              size="small"
              type="primary"
              icon={<CircleCheck size={14} />}
              loading={simulateRedemption.isPending}
              disabled={disabled || !canSimulate || errors.length > 0}
              onClick={handleSimulate}
            >
              Mô phỏng hoàn tất
            </Button>
          </Tooltip>
        )}
      </div>
    </div>
  );
};

export default PaperVoucherSummary;
