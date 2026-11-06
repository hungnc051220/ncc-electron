import type { PaperVoucherBatch } from "@shared/types";
import { describe, expect, it } from "vitest";
import {
  getPaperVoucherAvailability,
  sortPaperVoucherBatchesForPos,
  summarizePaperVoucherSelection,
  validatePaperVoucherSelection
} from "./paperVoucherRedemption";
import { PAPER_VOUCHER_FIXTURES } from "./paperVoucher.testUtils";

const today = "2026-10-30";

const batches: PaperVoucherBatch[] = [
  ...PAPER_VOUCHER_FIXTURES,
  { ...PAPER_VOUCHER_FIXTURES[3], id: 5, batchCode: "LÔ-005", expiresAt: "2026-11-15" },
  { ...PAPER_VOUCHER_FIXTURES[3], id: 6, batchCode: "LÔ-006", validFrom: "2026-12-01" },
  { ...PAPER_VOUCHER_FIXTURES[3], id: 7, batchCode: "LÔ-007", isLocked: true },
  { ...PAPER_VOUCHER_FIXTURES[3], id: 8, batchCode: "LÔ-008", expiresAt: null, faceValue: 50000 }
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
  it("accepts several batches within remaining quantities", () => {
    expect(
      validatePaperVoucherSelection({
        lines: [line(3, 1), line(4, 1)],
        batches,
        ticketCount: 2,
        today
      })
    ).toEqual([]);
  });

  it("does not cap the number of vouchers by the number of tickets", () => {
    expect(
      validatePaperVoucherSelection({
        lines: [line(3, 3), line(4, 2)],
        batches,
        ticketCount: 1,
        today
      })
    ).toEqual([]);
  });

  it("accepts at most 20 batch lines per order", () => {
    const manyBatches = Array.from({ length: 21 }, (_, index) => ({
      ...PAPER_VOUCHER_FIXTURES[3],
      id: 100 + index,
      batchCode: `LÔ-${100 + index}`
    }));
    const lines = manyBatches.map((batch) => ({
      batchId: batch.id,
      quantity: 1,
      faceValue: batch.faceValue
    }));
    const validate = (selected: typeof lines) =>
      validatePaperVoucherSelection({
        lines: selected,
        batches: manyBatches,
        ticketCount: 1,
        today
      });

    expect(validate(lines.slice(0, 20))).toEqual([]);
    expect(validate(lines)).toEqual(["Mỗi đơn dùng tối đa 20 lô voucher giấy"]);
  });

  it("requires at least one selected seat", () => {
    expect(
      validatePaperVoucherSelection({ lines: [line(3, 1)], batches, ticketCount: 0, today })
    ).toEqual(["Chưa chọn ghế để áp dụng voucher giấy"]);
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

  it("rejects quantities above remaining vouchers", () => {
    expect(
      validatePaperVoucherSelection({ lines: [line(3, 115)], batches, ticketCount: 1, today })
    ).toEqual(["LÔ-003 chỉ còn 114 voucher chưa ghi nhận sử dụng"]);
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

describe("summarizePaperVoucherSelection", () => {
  it("counts sheets and sums face values without computing any order amount", () => {
    expect(summarizePaperVoucherSelection([line(3, 2), line(4, 1)])).toEqual({
      voucherCount: 3,
      faceValueTotal: 295000
    });
    expect(summarizePaperVoucherSelection([])).toEqual({ voucherCount: 0, faceValueTotal: 0 });
  });
});
