import type { PaperVoucherBatch } from "@shared/types";
import { describe, expect, it } from "vitest";
import { PAPER_VOUCHER_SEED } from "./paperVoucher.mock";
import {
  calculatePaperVoucherPreview,
  getPaperVoucherAvailability,
  sortPaperVoucherBatchesForPos,
  validatePaperVoucherSelection
} from "./paperVoucherRedemption";

const today = "2026-10-30";

const batches: PaperVoucherBatch[] = [
  ...PAPER_VOUCHER_SEED,
  { ...PAPER_VOUCHER_SEED[3], id: 5, batchCode: "LÔ-005", expiresAt: "2026-11-15" },
  { ...PAPER_VOUCHER_SEED[3], id: 6, batchCode: "LÔ-006", validFrom: "2026-12-01" },
  { ...PAPER_VOUCHER_SEED[3], id: 7, batchCode: "LÔ-007", isLocked: true },
  { ...PAPER_VOUCHER_SEED[3], id: 8, batchCode: "LÔ-008", expiresAt: null, faceValue: 50000 }
];

const line = (batchId: number, quantity: number, faceValue?: number) => ({
  batchId,
  quantity,
  faceValue: faceValue ?? batches.find((batch) => batch.id === batchId)!.faceValue
});

describe("paper voucher POS availability", () => {
  it("only allows active batches with remaining vouchers", () => {
    const status = (id: number) =>
      getPaperVoucherAvailability(batches.find((batch) => batch.id === id)!, today);

    expect(status(3)).toMatchObject({ selectable: true, remainingQuantity: 114 });
    expect(status(1)).toMatchObject({ selectable: false, status: "expired" });
    expect(status(2)).toMatchObject({ selectable: false, status: "expired" });
    expect(status(6)).toMatchObject({ selectable: false, status: "upcoming" });
    expect(status(7)).toMatchObject({ selectable: false, status: "locked" });
  });

  it("lists usable batches first, closest expiry first and no-expiry batches last", () => {
    expect(sortPaperVoucherBatchesForPos(batches, today).map((batch) => batch.batchCode)).toEqual([
      "LÔ-005",
      "LÔ-003",
      "LÔ-004",
      "LÔ-008",
      "LÔ-001",
      "LÔ-002",
      "LÔ-006",
      "LÔ-007"
    ]);
  });
});

describe("validatePaperVoucherSelection", () => {
  it("accepts several batches within remaining quantities and seat count", () => {
    expect(
      validatePaperVoucherSelection({
        lines: [line(3, 1), line(4, 1)],
        batches,
        ticketCount: 2,
        today
      })
    ).toEqual([]);
  });

  it("rejects expired, upcoming and locked batches", () => {
    const errors = validatePaperVoucherSelection({
      lines: [line(1, 1), line(6, 1), line(7, 1)],
      batches,
      ticketCount: 5,
      today
    });

    expect(errors).toEqual(["LÔ-001: hết hạn", "LÔ-006: chưa bắt đầu", "LÔ-007: đã khóa"]);
  });

  it("rejects quantities above remaining vouchers or selected seats", () => {
    expect(
      validatePaperVoucherSelection({ lines: [line(3, 115)], batches, ticketCount: 200, today })
    ).toEqual(["LÔ-003 chỉ còn 114 voucher chưa ghi nhận sử dụng"]);
    expect(
      validatePaperVoucherSelection({
        lines: [line(3, 2), line(4, 1)],
        batches,
        ticketCount: 2,
        today
      })
    ).toEqual(["Số voucher (3) vượt số vé đang chọn (2)"]);
  });

  it("rejects duplicate lines, invalid quantities and changed face values", () => {
    expect(
      validatePaperVoucherSelection({
        lines: [line(3, 1), line(3, 1), line(4, 1.5), line(5, 1, 50000)],
        batches,
        ticketCount: 10,
        today
      })
    ).toEqual([
      "LÔ-003 được chọn nhiều lần",
      "Số lượng của LÔ-004 phải là số nguyên dương",
      "Mệnh giá LÔ-005 đã thay đổi, vui lòng chọn lại"
    ]);
  });
});

describe("calculatePaperVoucherPreview (mock face-value rule)", () => {
  it("deducts the total face value from the ticket amount", () => {
    const preview = calculatePaperVoucherPreview({
      lines: [line(3, 1), line(4, 1)],
      eligibleAmount: 300000
    });

    expect(preview).toMatchObject({
      voucherCount: 2,
      faceValueTotal: 195000,
      appliedAmount: 195000,
      payableAmount: 105000,
      excessAmount: 0
    });
  });

  it("caps the applied value at the eligible amount without negative or change amounts", () => {
    const preview = calculatePaperVoucherPreview({
      lines: [line(3, 1), line(4, 1)],
      eligibleAmount: 180000
    });

    expect(preview).toMatchObject({
      faceValueTotal: 195000,
      appliedAmount: 180000,
      payableAmount: 0,
      excessAmount: 15000
    });
    expect(preview.lines.map((item) => item.appliedAmount)).toEqual([100000, 80000]);
  });
});
