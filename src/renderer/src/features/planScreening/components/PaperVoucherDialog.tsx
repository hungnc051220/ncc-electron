import { usePaperVoucherBatches } from "@renderer/hooks/paperVouchers/usePaperVoucherBatches";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { cn, formatMoney, formatNumber } from "@renderer/lib/utils";
import PaperVoucherThumbnail from "@renderer/features/vouchers/paperVouchers/components/PaperVoucherThumbnail";
import {
  formatPaperVoucherDate,
  getVietnamBusinessDate,
  PAPER_VOUCHER_NO_EXPIRY_LABEL,
  PAPER_VOUCHER_STATUS_META
} from "@renderer/features/vouchers/paperVouchers/paperVoucher.utils";
import {
  getPaperVoucherAvailability,
  sortPaperVoucherBatchesForPos,
  summarizePaperVoucherSelection,
  validatePaperVoucherSelection,
  type PaperVoucherSelectionLine
} from "@renderer/features/vouchers/paperVouchers/paperVoucherRedemption";
import type { PaperVoucherBatch } from "@shared/types";
import { Alert, Button, Empty, InputNumber, Modal, Segmented, Space, Spin, Tag } from "antd";
import { CalendarDays, CircleAlert, Minus, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { isPaperVoucherSaleEnabled } from "./paperVoucherSale";

interface PaperVoucherDialogProps {
  open: boolean;
  value: PaperVoucherSelectionLine[];
  ticketCount: number;
  ticketAmount: number;
  discountAmount: number;
  onCancel: () => void;
  onApply: (lines: PaperVoucherSelectionLine[]) => void;
}

const ALL_FACE_VALUES = "all";
// Tham chiếu cố định khi chưa có dữ liệu, tránh memo phía dưới tính lại mỗi lần render.
const EMPTY_BATCHES: PaperVoucherBatch[] = [];

const formatValidity = (batch: PaperVoucherBatch) => {
  if (!batch.expiresAt) {
    return batch.validFrom
      ? `Từ ${formatPaperVoucherDate(batch.validFrom)} · ${PAPER_VOUCHER_NO_EXPIRY_LABEL}`
      : PAPER_VOUCHER_NO_EXPIRY_LABEL;
  }

  return batch.validFrom
    ? `${formatPaperVoucherDate(batch.validFrom)} – ${formatPaperVoucherDate(batch.expiresAt)}`
    : `Đến ${formatPaperVoucherDate(batch.expiresAt)}`;
};

const SummaryRow = ({
  label,
  value,
  valueClassName
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) => (
  <div className="flex items-baseline justify-between gap-3">
    <span className="text-slate-600 dark:text-slate-300">{label}</span>
    <span
      className={cn(
        "font-semibold whitespace-nowrap text-slate-900 tabular-nums dark:text-slate-100",
        valueClassName
      )}
    >
      {value}
    </span>
  </div>
);

const PaperVoucherDialog = ({
  open,
  value,
  ticketCount,
  ticketAmount,
  discountAmount,
  onCancel,
  onApply
}: PaperVoucherDialogProps) => {
  // Đọc lô từ API để chọn; số tiền khách cần trả do backend báo giá sau khi áp dụng.
  // Bản nháp chỉ áp dụng khi xác nhận; hủy modal giữ nguyên lựa chọn trước đó.
  const saleEnabled = isPaperVoucherSaleEnabled();
  const [draft, setDraft] = useState<PaperVoucherSelectionLine[]>(value);
  const [faceValueFilter, setFaceValueFilter] = useState<number | typeof ALL_FACE_VALUES>(
    ALL_FACE_VALUES
  );
  const { data: batches = EMPTY_BATCHES, error, isFetching } = usePaperVoucherBatches(open, true);
  // Lỗi API (vd. thiếu quyền xem voucher giấy) hiển thị nguyên.
  const loadError = error
    ? getApiErrorMessage(error, "Không tải được danh sách voucher giấy")
    : null;
  const today = getVietnamBusinessDate();

  const sortedBatches = useMemo(
    () => sortPaperVoucherBatchesForPos(batches, today),
    [batches, today]
  );
  const faceValueOptions = useMemo(
    () =>
      Array.from(new Set(batches.map((batch) => batch.faceValue)))
        .sort((left, right) => right - left)
        .map((faceValue) => ({ value: faceValue, label: formatMoney(faceValue) })),
    [batches]
  );
  const visibleBatches =
    faceValueFilter === ALL_FACE_VALUES
      ? sortedBatches
      : sortedBatches.filter((batch) => batch.faceValue === faceValueFilter);
  const availableBatches = visibleBatches.filter(
    (batch) => getPaperVoucherAvailability(batch, today).selectable
  );
  const unavailableBatches = visibleBatches.filter(
    (batch) => !getPaperVoucherAvailability(batch, today).selectable
  );

  const draftByBatchId = new Map(draft.map((line) => [line.batchId, line]));
  const { voucherCount, faceValueTotal } = summarizePaperVoucherSelection(draft);
  const errors = validatePaperVoucherSelection({ lines: draft, batches, ticketCount, today });

  const setQuantity = (batch: PaperVoucherBatch, quantity: number) => {
    setDraft((current) => {
      if (quantity <= 0) return current.filter((line) => line.batchId !== batch.id);
      if (!current.some((line) => line.batchId === batch.id)) {
        return [...current, { batchId: batch.id, quantity, faceValue: batch.faceValue }];
      }
      return current.map((line) => (line.batchId === batch.id ? { ...line, quantity } : line));
    });
  };

  const renderBatch = (batch: PaperVoucherBatch) => {
    const { status, selectable, remainingQuantity } = getPaperVoucherAvailability(batch, today);
    const quantity = draftByBatchId.get(batch.id)?.quantity ?? 0;
    // Không giới hạn theo số vé: chỉ giới hạn theo số voucher còn lại của lô.
    const maxQuantity = Math.max(0, remainingQuantity);
    const isSelected = quantity > 0;
    const canAdd = selectable && maxQuantity > quantity;
    const hasImage = !!batch.images?.length;

    return (
      <div
        key={batch.id}
        data-testid={`paper-voucher-option-${batch.batchCode}`}
        aria-disabled={!selectable}
        onClick={() => {
          if (selectable && !isSelected && maxQuantity >= 1) setQuantity(batch, 1);
        }}
        className={cn(
          "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors duration-150",
          !selectable && "border-dashed border-app-border",
          selectable && !isSelected && "border-app-border",
          selectable &&
            !isSelected &&
            maxQuantity >= 1 &&
            "cursor-pointer hover:border-primary/50 hover:bg-primary/3 dark:hover:bg-primary/10",
          isSelected &&
            "border-primary bg-primary/5 ring-1 ring-primary/20 dark:border-indigo-400/60 dark:bg-primary/15"
        )}
      >
        <div
          className={cn(
            "flex h-12 w-28 shrink-0 items-center justify-center rounded-md text-[15px] font-bold tabular-nums",
            selectable
              ? "bg-primary/8 text-primary dark:bg-primary/25 dark:text-indigo-200"
              : "bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500"
          )}
        >
          {formatMoney(batch.faceValue)}
        </div>
        {hasImage && (
          <div onClick={(event) => event.stopPropagation()}>
            <PaperVoucherThumbnail batch={batch} />
          </div>
        )}
        <div className={cn("min-w-0 flex-1", !selectable && "opacity-60")}>
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 rounded bg-slate-100 px-1.5 py-px text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200">
              {batch.batchCode}
            </span>
            <span className="truncate font-medium text-slate-800 dark:text-slate-100">
              {batch.name}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <CalendarDays size={13} className="shrink-0" />
            <span className="truncate">{formatValidity(batch)}</span>
            <span aria-hidden>·</span>
            <span className="whitespace-nowrap">Còn {formatNumber(remainingQuantity)}</span>
          </div>
        </div>
        <div className="shrink-0" onClick={(event) => event.stopPropagation()}>
          {!selectable ? (
            <Tag color={PAPER_VOUCHER_STATUS_META[status].color} className="m-0">
              {PAPER_VOUCHER_STATUS_META[status].label}
            </Tag>
          ) : isSelected ? (
            <Space.Compact size="small">
              <Button
                icon={<Minus size={14} />}
                aria-label={`Giảm số lượng ${batch.batchCode}`}
                onClick={() => setQuantity(batch, quantity - 1)}
              />
              <InputNumber<number>
                className="w-12 [&_input]:text-center!"
                controls={false}
                min={1}
                max={Math.max(quantity, maxQuantity)}
                precision={0}
                value={quantity}
                aria-label={`Số lượng ${batch.batchCode}`}
                onChange={(next) => setQuantity(batch, Math.max(1, next ?? 1))}
              />
              <Button
                icon={<Plus size={14} />}
                aria-label={`Tăng số lượng ${batch.batchCode}`}
                disabled={!canAdd}
                onClick={() => setQuantity(batch, quantity + 1)}
              />
            </Space.Compact>
          ) : (
            <Button size="small" disabled={maxQuantity < 1} onClick={() => setQuantity(batch, 1)}>
              Chọn
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Modal
      open={open}
      width={920}
      title={
        <div className="flex items-center gap-2">
          <span>Áp dụng voucher giấy</span>
          <Tag color="warning" variant="outlined" className="m-0 font-normal">
            {saleEnabled ? "Tương đương tiền mặt" : "Chưa ghi nhận vào đơn bán vé"}
          </Tag>
        </div>
      }
      okText="Áp dụng"
      cancelText="Hủy"
      onCancel={onCancel}
      onOk={() => onApply(draft)}
      okButtonProps={{ disabled: !!loadError || draft.length === 0 || errors.length > 0 }}
      destroyOnHidden
    >
      <div className="grid grid-cols-[minmax(0,1fr)_260px] gap-4 pt-1">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            {faceValueOptions.length > 1 ? (
              <Segmented
                size="small"
                className="self-start"
                value={faceValueFilter}
                onChange={(next) => setFaceValueFilter(next as number | typeof ALL_FACE_VALUES)}
                options={[{ value: ALL_FACE_VALUES, label: "Tất cả" }, ...faceValueOptions]}
              />
            ) : (
              <span />
            )}
            <span className="text-xs whitespace-nowrap text-slate-500 dark:text-slate-400">
              Đã chọn{" "}
              <b className="text-slate-800 tabular-nums dark:text-slate-100">
                {formatNumber(voucherCount)}
              </b>{" "}
              voucher
            </span>
          </div>

          <Spin spinning={isFetching && !batches.length}>
            <div
              data-testid="paper-voucher-batch-list"
              className="flex max-h-90 flex-col gap-2 overflow-y-auto pr-1"
            >
              {loadError && (
                <Alert
                  data-testid="paper-voucher-load-error"
                  type="error"
                  showIcon
                  title="Không tải được danh sách voucher giấy"
                  description={loadError}
                />
              )}
              {!loadError && visibleBatches.length === 0 && (
                <Empty
                  className="py-6"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Không có lô voucher giấy"
                />
              )}
              {availableBatches.map(renderBatch)}
              {unavailableBatches.length > 0 && (
                <div className="pt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Không khả dụng ({unavailableBatches.length})
                </div>
              )}
              {unavailableBatches.map(renderBatch)}
            </div>
          </Spin>
        </div>

        <aside
          data-testid="paper-voucher-summary"
          className="flex flex-col gap-2 self-start rounded-xl border border-app-border bg-slate-50 p-4 text-sm dark:bg-white/5"
        >
          <SummaryRow label="Số vé đang chọn" value={formatNumber(ticketCount)} />
          <SummaryRow label="Tiền vé ban đầu" value={formatMoney(ticketAmount)} />
          {discountAmount > 0 && (
            <SummaryRow label="Giảm giá đang chọn" value={`−${formatMoney(discountAmount)}`} />
          )}
          <div className="my-1 border-t border-app-border" />
          <SummaryRow label="Số voucher giấy" value={formatNumber(voucherCount)} />
          <SummaryRow label="Tổng mệnh giá voucher" value={formatMoney(faceValueTotal)} />
          {draft.length > 0 && errors.length > 0 && (
            <div
              role="alert"
              className="flex gap-1.5 rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300"
            >
              <CircleAlert size={14} className="mt-px shrink-0" />
              <ul className="m-0 list-none p-0">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          <p
            data-testid="paper-voucher-dialog-note"
            className="m-0 mt-1 border-t border-app-border pt-3 text-[11px] leading-4 text-slate-500 dark:text-slate-400"
          >
            {saleEnabled
              ? "Voucher giấy dùng như tiền mặt để thanh toán đơn, không làm giảm giá vé. Sau khi áp dụng, hệ thống tính số tiền khách cần thanh toán thêm. Phần mệnh giá vượt giá trị đơn không được hoàn lại."
              : "Số lượng lô lấy từ hệ thống. Hệ thống chưa ghi nhận voucher giấy vào đơn bán vé."}
          </p>
        </aside>
      </div>
    </Modal>
  );
};

export default PaperVoucherDialog;
