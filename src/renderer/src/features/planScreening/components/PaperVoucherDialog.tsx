import { usePaperVoucherBatches } from "@renderer/hooks/paperVouchers/usePaperVoucherBatches";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { cn, formatMoney, formatNumber } from "@renderer/lib/utils";
import PaperVoucherThumbnail from "@renderer/features/paperVouchers/components/PaperVoucherThumbnail";
import {
  formatPaperVoucherDate,
  getVietnamBusinessDate,
  PAPER_VOUCHER_NO_EXPIRY_LABEL,
  PAPER_VOUCHER_STATUS_META
} from "@renderer/features/paperVouchers/paperVoucher.utils";
import {
  getPaperVoucherAvailability,
  sortPaperVoucherBatchesForPos,
  summarizePaperVoucherSelection,
  validatePaperVoucherSelection,
  type PaperVoucherSelectionLine
} from "@renderer/features/paperVouchers/paperVoucherRedemption";
import type { PaperVoucherBatch, PaperVoucherOrderQuote } from "@shared/types";
import { Alert, Button, Empty, InputNumber, Modal, Space, Spin, Tag } from "antd";
import {
  CalendarDays,
  CircleAlert,
  CircleCheck,
  LoaderCircle,
  Minus,
  Plus,
  TriangleAlert,
  X
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

/** Báo giá backend của lựa chọn voucher giấy đang áp dụng cho đơn. */
export interface PaperVoucherAppliedQuote {
  quote?: PaperVoucherOrderQuote;
  isLoading: boolean;
  errorMessage?: string;
  /** Báo giá mới backend trả khi số tiền đổi lúc tạo đơn: thu ngân phải xác nhận lại. */
  isReplaced?: boolean;
  /** Tên phương thức thu phần còn lại (Tiền mặt/Quét VietQR). */
  paymentMethodLabel: string;
  onRetry: () => void;
}

interface PaperVoucherDialogProps {
  open: boolean;
  value: PaperVoucherSelectionLine[];
  ticketCount: number;
  ticketAmount: number;
  discountAmount: number;
  /** Báo giá backend của bản nháp đang chọn (bên gọi báo giá theo `onDraftChange`). */
  draftQuote?: PaperVoucherAppliedQuote;
  memberCardCode?: string;
  clearDisabled?: boolean;
  /** Bản nháp đổi: bên gọi báo giá ngay để thu ngân thấy số tiền trừ trước khi áp dụng. */
  onDraftChange?: (lines: PaperVoucherSelectionLine[]) => void;
  onClear?: () => void;
  onCancel: () => void;
  onApply: (lines: PaperVoucherSelectionLine[]) => void;
}

// Cảnh báo đã hiển thị bằng dòng riêng trong panel, không lặp lại.
const RENDERED_WARNING_CODES = new Set(["PAPER_VOUCHER_EXCESS", "PAPER_VOUCHER_FULLY_PAID"]);
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
  hint,
  value,
  valueClassName,
  testId,
  total = false,
  muted = false
}: {
  label: string;
  hint?: string;
  value: ReactNode;
  valueClassName?: string;
  testId?: string;
  /** Dòng tổng: kẻ đứt phía trên và dưới, chữ đậm hơn. */
  total?: boolean;
  /** Thông tin phụ: chữ nhạt hơn. */
  muted?: boolean;
}) => (
  <div
    className={cn(
      "flex items-baseline justify-between gap-3",
      total && "my-0.5 border-y border-dashed border-app-border py-2"
    )}
  >
    <span
      className={cn(
        "text-slate-600 dark:text-slate-300",
        total && "font-semibold text-slate-900 dark:text-slate-100",
        muted && "text-slate-500 dark:text-slate-400"
      )}
    >
      {label}
      {hint && <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">· {hint}</span>}
    </span>
    <span
      data-testid={testId}
      className={cn(
        "font-medium whitespace-nowrap text-slate-900 tabular-nums dark:text-slate-100",
        total && "text-base font-bold",
        muted && "font-normal text-slate-500 dark:text-slate-400",
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
  draftQuote,
  memberCardCode,
  clearDisabled,
  onDraftChange,
  onClear,
  onCancel,
  onApply
}: PaperVoucherDialogProps) => {
  // Đọc lô từ API để chọn; số tiền khách cần trả do backend báo giá theo bản nháp.
  // Bản nháp chỉ áp dụng khi xác nhận; hủy modal giữ nguyên lựa chọn trước đó.
  const [draft, setDraft] = useState<PaperVoucherSelectionLine[]>(value);
  const updateDraft = (next: PaperVoucherSelectionLine[]) => {
    setDraft(next);
    onDraftChange?.(next);
  };
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
  const draftByBatchId = new Map(draft.map((line) => [line.batchId, line]));
  // Chỉ hiện lô dùng được. Lô đã chọn nhưng vừa hết hạn/bị khóa vẫn hiện để thu ngân bỏ chọn.
  const visibleBatches = sortedBatches.filter(
    (batch) => getPaperVoucherAvailability(batch, today).selectable || draftByBatchId.has(batch.id)
  );
  const { voucherCount, faceValueTotal } = summarizePaperVoucherSelection(draft);
  const errors = validatePaperVoucherSelection({ lines: draft, batches, ticketCount, today });
  const isApplied = value.length > 0;
  const hasDraft = draft.length > 0;
  const quote = hasDraft && !draftQuote?.isLoading ? draftQuote?.quote : undefined;

  const setQuantity = (batch: PaperVoucherBatch, quantity: number) => {
    if (quantity <= 0) {
      updateDraft(draft.filter((line) => line.batchId !== batch.id));
    } else if (!draftByBatchId.has(batch.id)) {
      updateDraft([...draft, { batchId: batch.id, quantity, faceValue: batch.faceValue }]);
    } else {
      updateDraft(draft.map((line) => (line.batchId === batch.id ? { ...line, quantity } : line)));
    }
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

  const renderPayable = () => {
    // Chưa có báo giá nào cho bản nháp (vd. chưa cấu hình máy POS): không hiển thị khối số tiền.
    if (!hasDraft || !draftQuote) return null;
    if (!draftQuote.isLoading && !draftQuote.errorMessage && !draftQuote.quote) return null;

    const { isLoading, errorMessage, isReplaced, paymentMethodLabel, onRetry } = draftQuote;
    const isFullyPaid = quote?.remainingPayable === 0;
    const notices: { key: string; testId: string; message: ReactNode }[] = [
      ...(quote && quote.excessAmount > 0
        ? [
            {
              key: "excess",
              testId: "paper-voucher-excess-warning",
              message: (
                <span>
                  Tiền thừa{" "}
                  <b data-testid="paper-voucher-excess" className="font-semibold tabular-nums">
                    {formatMoney(quote.excessAmount)}
                  </b>{" "}
                  không hoàn lại
                </span>
              )
            }
          ]
        : []),
      ...(isReplaced
        ? [
            {
              key: "replaced",
              testId: "paper-voucher-quote-replaced",
              message: "Số tiền vừa thay đổi, kiểm tra lại trước khi In vé"
            }
          ]
        : []),
      ...(quote?.warnings ?? [])
        .filter((warning) => !RENDERED_WARNING_CODES.has(warning.code))
        .map((warning) => ({
          key: warning.code,
          testId: "paper-voucher-quote-warning",
          message: warning.message
        }))
    ];

    return (
      <>
        <div
          data-testid="paper-voucher-pos-summary"
          className={cn(
            "flex flex-col gap-1 rounded-xl px-4 py-3",
            !isLoading && (errorMessage || !quote)
              ? "border border-red-200 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300"
              : "relative overflow-hidden border border-primary/15 bg-linear-to-br from-white to-indigo-50 shadow-[0_10px_24px_-14px_rgba(70,79,180,0.45)] before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-primary dark:border-amber-100/15 dark:from-[#211e24] dark:to-[#18161a] dark:shadow-none dark:before:bg-amber-300"
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "text-[11px] font-medium tracking-wider whitespace-nowrap uppercase",
                errorMessage ? "opacity-80" : "text-slate-500 dark:text-stone-400"
              )}
            >
              Khách cần trả thêm
            </span>
            {quote &&
              (isFullyPaid ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 whitespace-nowrap py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-400/15 dark:text-emerald-300 dark:ring-emerald-300/30">
                  <CircleCheck size={12} />
                  Đã thanh toán đủ
                </span>
              ) : (
                <span
                  data-testid="paper-voucher-payment-method"
                  className="rounded-full bg-white px-2 py-0.5 whitespace-nowrap text-[11px] font-medium text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-100 dark:ring-white/15"
                >
                  {paymentMethodLabel}
                </span>
              ))}
          </div>
          {isLoading ? (
            <span
              data-testid="paper-voucher-quote-loading"
              className="inline-flex h-9 items-center gap-1.5 text-sm text-slate-500 dark:text-stone-300"
            >
              <LoaderCircle size={16} className="animate-spin" />
              Đang tính số tiền...
            </span>
          ) : errorMessage || !quote ? (
            <div className="flex items-center justify-between gap-2 py-1">
              <span role="alert" data-testid="paper-voucher-quote-error" className="text-xs">
                {errorMessage}
              </span>
              <Button size="small" danger onClick={onRetry}>
                Thử lại
              </Button>
            </div>
          ) : (
            <b
              data-testid="paper-voucher-remaining"
              className="text-[28px] leading-9 font-semibold tracking-tight text-slate-900 tabular-nums dark:text-amber-50"
            >
              {formatMoney(quote.remainingPayable)}
            </b>
          )}
        </div>
        {notices.map((notice) => (
          <div
            key={notice.key}
            data-testid={notice.testId}
            className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs leading-4 text-amber-800 dark:border-amber-300/25 dark:bg-amber-400/10 dark:text-amber-200"
          >
            <TriangleAlert size={14} className="shrink-0 text-amber-500 dark:text-amber-300" />
            {notice.message}
          </div>
        ))}
      </>
    );
  };

  return (
    <Modal
      open={open}
      width={960}
      centered
      title={
        <div className="flex items-center gap-2">
          <span>Áp dụng voucher giấy</span>
          <Tag color="warning" variant="outlined" className="m-0 font-normal">
            Tương đương tiền mặt
          </Tag>
        </div>
      }
      okText="Áp dụng"
      cancelText="Hủy"
      onCancel={onCancel}
      onOk={() => onApply(draft)}
      okButtonProps={{ disabled: !!loadError || draft.length === 0 || errors.length > 0 }}
      footer={(_, { OkBtn, CancelBtn }) => (
        <div className="flex items-center justify-end gap-2">
          <CancelBtn />
          {isApplied && onClear && (
            <Button
              danger
              icon={<X size={14} />}
              disabled={clearDisabled}
              onClick={() => {
                updateDraft([]);
                onClear();
              }}
            >
              Bỏ áp dụng
            </Button>
          )}
          <OkBtn />
        </div>
      )}
      destroyOnHidden
    >
      <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-4 pt-1">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-medium text-slate-600 dark:text-slate-300">
              Chọn lô theo mệnh giá in trên voucher
            </span>
            <div className="flex h-6 items-center gap-2 whitespace-nowrap text-slate-500 dark:text-slate-400">
              <span>
                Đã chọn{" "}
                <b className="text-slate-800 tabular-nums dark:text-slate-100">
                  {formatNumber(voucherCount)}
                </b>{" "}
                voucher
              </span>
              {hasDraft && (
                <>
                  <span aria-hidden className="h-3.5 w-px bg-slate-300 dark:bg-white/15" />
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center gap-1 rounded-md border-0 bg-transparent px-1.5 py-0.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                    onClick={() => updateDraft([])}
                  >
                    <X size={12} />
                    Bỏ chọn tất cả
                  </button>
                </>
              )}
            </div>
          </div>

          <Spin spinning={isFetching && !batches.length}>
            <div
              data-testid="paper-voucher-batch-list"
              className="flex max-h-[min(30rem,calc(100vh-16rem))] flex-col gap-2 overflow-y-auto pr-1"
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
                  description="Không có lô voucher giấy khả dụng"
                />
              )}
              {visibleBatches.map(renderBatch)}
            </div>
          </Spin>
        </div>

        <aside data-testid="paper-voucher-summary" className="flex flex-col gap-2.5 self-start">
          <div className="flex flex-col gap-2 rounded-xl border border-app-border bg-slate-50/70 px-4 py-3.5 text-sm dark:bg-white/3">
            <SummaryRow
              label="Tiền vé"
              hint={`${formatNumber(ticketCount)} vé`}
              value={formatMoney(ticketAmount)}
            />
            {discountAmount > 0 && (
              <SummaryRow
                label="Giảm giá"
                value={`−${formatMoney(discountAmount)}`}
                valueClassName="text-red-600 dark:text-red-400"
              />
            )}
            {memberCardCode && hasDraft && (
              <SummaryRow label="Thẻ thành viên" value={memberCardCode} />
            )}
            {quote && (
              <SummaryRow
                total
                label="Tổng tiền đơn"
                value={formatMoney(quote.orderTotal)}
                testId="paper-voucher-order-total"
              />
            )}
            <SummaryRow
              muted
              label="Mệnh giá voucher"
              hint={`${formatNumber(voucherCount)} tờ`}
              value={formatMoney(quote?.faceValueTotal ?? faceValueTotal)}
              testId="paper-voucher-face-value-total"
            />
            {quote && (
              <SummaryRow
                label="Voucher thanh toán"
                value={`−${formatMoney(quote.voucherApplied)}`}
                valueClassName="text-emerald-600 dark:text-emerald-400"
                testId="paper-voucher-applied"
              />
            )}
          </div>
          {draft.length > 0 && errors.length > 0 && (
            <div
              role="alert"
              data-testid="paper-voucher-selection-error"
              className="flex gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300"
            >
              <CircleAlert size={14} className="mt-px shrink-0" />
              <ul className="m-0 list-none p-0">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          {renderPayable()}
        </aside>
      </div>
    </Modal>
  );
};

export default PaperVoucherDialog;
