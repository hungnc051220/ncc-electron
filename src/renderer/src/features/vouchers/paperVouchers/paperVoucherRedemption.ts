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

/**
 * Kiểm tra lựa chọn voucher giấy với dữ liệu lô mới nhất.
 * Trả về danh sách lỗi tiếng Việt; rỗng nghĩa là hợp lệ.
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

  const voucherCount = lines.reduce((total, line) => total + line.quantity, 0);
  if (ticketCount > 0 && voucherCount > ticketCount) {
    errors.push(`Số voucher (${voucherCount}) vượt số vé đang chọn (${ticketCount})`);
  }

  return errors;
};

/**
 * PHÉP TÍNH MINH HỌA cho giai đoạn mock: voucher giấy trừ theo mệnh giá.
 * Chưa phải quy tắc tài chính được NCC phê duyệt; khi có backend, thay bằng kết quả backend trả về.
 *
 * - Giá trị áp dụng = min(tổng mệnh giá, tiền vé đủ điều kiện), phân bổ lần lượt theo từng dòng.
 * - Còn thanh toán = max(0, tiền vé đủ điều kiện - giá trị áp dụng); không phát sinh tiền thừa.
 */
export const calculatePaperVoucherPreview = ({
  lines,
  eligibleAmount
}: {
  lines: Pick<PaperVoucherSelectionLine, "batchId" | "quantity" | "faceValue">[];
  eligibleAmount: number;
}) => {
  const safeEligibleAmount = Math.max(0, eligibleAmount);
  let remainingEligible = safeEligibleAmount;

  const previewLines = lines.map((line) => {
    const faceValueTotal = line.faceValue * line.quantity;
    const appliedAmount = Math.min(faceValueTotal, remainingEligible);
    remainingEligible -= appliedAmount;
    return { ...line, faceValueTotal, appliedAmount };
  });

  const voucherCount = lines.reduce((total, line) => total + line.quantity, 0);
  const faceValueTotal = previewLines.reduce((total, line) => total + line.faceValueTotal, 0);
  const appliedAmount = Math.min(faceValueTotal, safeEligibleAmount);

  return {
    lines: previewLines,
    voucherCount,
    faceValueTotal,
    appliedAmount,
    payableAmount: Math.max(0, safeEligibleAmount - appliedAmount),
    excessAmount: Math.max(0, faceValueTotal - safeEligibleAmount)
  };
};

export type PaperVoucherPreview = ReturnType<typeof calculatePaperVoucherPreview>;

export const createMockPaperVoucherTransactionId = () =>
  `MOCK-VG-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
