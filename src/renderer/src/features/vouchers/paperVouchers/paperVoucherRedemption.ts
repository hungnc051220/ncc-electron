import type { PaperVoucherBatch, PaperVoucherRedemptionLine } from "@shared/types";
import {
  comparePaperVoucherDate,
  getPaperVoucherAmounts,
  getPaperVoucherStatus,
  getVietnamBusinessDate,
  PAPER_VOUCHER_STATUS_META,
  type PaperVoucherStatus
} from "./paperVoucher.utils";

export type PaperVoucherSelectionLine = PaperVoucherRedemptionLine;

export const getPaperVoucherAvailability = (
  batch: PaperVoucherBatch,
  today: string = getVietnamBusinessDate()
) => {
  const status: PaperVoucherStatus = getPaperVoucherStatus(batch, today);

  return {
    status,
    selectable: status === "active",
    remainingQuantity: getPaperVoucherAmounts(batch).remainingQuantity
  };
};

/** Lô dùng được lên trước, ưu tiên lô gần hết hạn; lô không có thời hạn xếp sau cùng. */
export const sortPaperVoucherBatchesForPos = (
  batches: PaperVoucherBatch[],
  today: string = getVietnamBusinessDate()
) =>
  [...batches].sort((left, right) => {
    const leftSelectable = getPaperVoucherAvailability(left, today).selectable;
    const rightSelectable = getPaperVoucherAvailability(right, today).selectable;
    if (leftSelectable !== rightSelectable) return leftSelectable ? -1 : 1;

    return (
      comparePaperVoucherDate(left.expiresAt, right.expiresAt, "max") ||
      right.faceValue - left.faceValue ||
      left.batchCode.localeCompare(right.batchCode, "vi", { numeric: true })
    );
  });

/** Backend nhận tối đa 20 dòng (mỗi lô một dòng) trong một đơn. */
export const PAPER_VOUCHER_MAX_LINES = 20;

/**
 * Kiểm tra lựa chọn voucher giấy với dữ liệu lô mới nhất.
 * Trả về danh sách lỗi tiếng Việt; rỗng nghĩa là hợp lệ.
 *
 * Không giới hạn số tờ theo số vé: voucher trừ theo mệnh giá trên toàn đơn. Số tiền áp dụng, phần
 * vượt (không hoàn lại) và số tiền khách cần trả do backend tính qua báo giá đơn.
 */
export const validatePaperVoucherSelection = ({
  lines,
  batches,
  ticketCount,
  today = getVietnamBusinessDate()
}: {
  lines: PaperVoucherSelectionLine[];
  batches: PaperVoucherBatch[];
  ticketCount: number;
  today?: string;
}): string[] => {
  const errors: string[] = [];
  const batchesById = new Map(batches.map((batch) => [batch.id, batch]));
  const seenBatchIds = new Set<number>();

  if (ticketCount <= 0) errors.push("Chưa chọn ghế để áp dụng voucher giấy");
  if (lines.length > PAPER_VOUCHER_MAX_LINES) {
    errors.push(`Mỗi đơn dùng tối đa ${PAPER_VOUCHER_MAX_LINES} lô voucher giấy`);
  }

  lines.forEach((line) => {
    const batch = batchesById.get(line.batchId);

    if (!batch) {
      errors.push("Có lô voucher không còn tồn tại, vui lòng chọn lại");
      return;
    }

    if (seenBatchIds.has(line.batchId)) {
      errors.push(`${batch.batchCode} được chọn nhiều lần`);
      return;
    }
    seenBatchIds.add(line.batchId);

    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      errors.push(`Số lượng của ${batch.batchCode} phải là số nguyên dương`);
      return;
    }

    if (line.faceValue !== batch.faceValue) {
      errors.push(`Mệnh giá ${batch.batchCode} đã thay đổi, vui lòng chọn lại`);
      return;
    }

    const { status, selectable, remainingQuantity } = getPaperVoucherAvailability(batch, today);
    if (!selectable) {
      errors.push(`${batch.batchCode}: ${PAPER_VOUCHER_STATUS_META[status].label.toLowerCase()}`);
      return;
    }

    if (line.quantity > remainingQuantity) {
      errors.push(`${batch.batchCode} chỉ còn ${remainingQuantity} voucher chưa ghi nhận sử dụng`);
    }
  });

  return errors;
};

/** Số tờ và tổng mệnh giá của lựa chọn (chỉ để đối chiếu phiếu, không phải số tiền được trừ). */
export const summarizePaperVoucherSelection = (lines: PaperVoucherSelectionLine[]) => ({
  voucherCount: lines.reduce((total, line) => total + line.quantity, 0),
  faceValueTotal: lines.reduce((total, line) => total + line.faceValue * line.quantity, 0)
});
