import type { PaperVoucherBatch } from "@shared/types";
import { describe, expect, it } from "vitest";
import {
  comparePaperVoucherDate,
  countPaperVoucherFilters,
  getPaperVoucherAmounts,
  getPaperVoucherStatus,
  getPaperVoucherUsageStatusMeta,
  getVietnamBusinessDate,
  PAPER_VOUCHER_NO_EXPIRY_FILTER,
  PAPER_VOUCHER_USAGE_STATUS_META,
  summarizePaperVoucherBatches,
  toPaperVoucherBatchFilterQuery,
  validatePaperVoucherBatchDto,
  validatePaperVoucherImageFile
} from "./paperVoucher.utils";
import { PAPER_VOUCHER_FIXTURES } from "./paperVoucher.testUtils";

const makeBatch = (overrides: Partial<PaperVoucherBatch> = {}): PaperVoucherBatch => ({
  id: 1,
  batchCode: "LÔ-001",
  name: "Voucher giấy 100.000đ",
  faceValue: 100000,
  totalQuantity: 200,
  usedCount: 50,
  validFrom: null,
  expiresAt: "2026-12-31",
  isLocked: false,
  note: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides
});

describe("getVietnamBusinessDate", () => {
  it("uses the Vietnam calendar day regardless of UTC date", () => {
    expect(getVietnamBusinessDate("2026-12-31T16:59:59.999Z")).toBe("2026-12-31");
    expect(getVietnamBusinessDate("2026-12-31T17:00:00.000Z")).toBe("2027-01-01");
  });
});

describe("getPaperVoucherStatus", () => {
  it("keeps a batch valid until the end of its expiry day in Vietnam time", () => {
    const batch = makeBatch({ expiresAt: "2026-12-31" });

    expect(getPaperVoucherStatus(batch, getVietnamBusinessDate("2026-12-31T16:59:59Z"))).toBe(
      "active"
    );
    expect(getPaperVoucherStatus(batch, getVietnamBusinessDate("2026-12-31T17:00:00Z"))).toBe(
      "expired"
    );
  });

  it("never expires batches without an expiry date", () => {
    expect(getPaperVoucherStatus(makeBatch({ expiresAt: null }), "2099-12-31")).toBe("active");
    expect(
      getPaperVoucherStatus(makeBatch({ expiresAt: undefined, usedCount: 200 }), "2099-12-31")
    ).toBe("depleted");
  });

  it("marks batches that have not started yet", () => {
    const batch = makeBatch({ validFrom: "2026-11-01" });

    expect(getPaperVoucherStatus(batch, "2026-10-31")).toBe("upcoming");
    expect(getPaperVoucherStatus(batch, "2026-11-01")).toBe("active");
  });

  it("prioritises locked, then expired, then depleted", () => {
    expect(getPaperVoucherStatus(makeBatch({ isLocked: true }), "2027-06-01")).toBe("locked");
    expect(getPaperVoucherStatus(makeBatch({ usedCount: 200 }), "2027-01-01")).toBe("expired");
    expect(getPaperVoucherStatus(makeBatch({ usedCount: 200 }), "2026-10-30")).toBe("depleted");
  });
});

describe("amounts and summary", () => {
  it("computes remaining quantity and face values per batch", () => {
    expect(getPaperVoucherAmounts(makeBatch())).toEqual({
      remainingQuantity: 150,
      totalFaceValue: 20000000,
      usedFaceValue: 5000000,
      remainingFaceValue: 15000000
    });
  });

  it("totals quantities and face values across batches", () => {
    expect(summarizePaperVoucherBatches(PAPER_VOUCHER_FIXTURES)).toEqual({
      totalBatches: 4,
      totalQuantity: 1100,
      usedCount: 654,
      remainingQuantity: 446,
      totalFaceValue: 50000000 + 5000000 + 20000000 + 28500000,
      usedFaceValue: 46800000 + 5000000 + 8600000,
      remainingFaceValue: 3200000 + 0 + 11400000 + 28500000
    });
  });
});

describe("countPaperVoucherFilters", () => {
  it("counts only filters that are actually applied", () => {
    expect(countPaperVoucherFilters({})).toBe(0);
    expect(countPaperVoucherFilters({ keyword: "   " })).toBe(0);
    expect(countPaperVoucherFilters({ keyword: "lo-001", faceValue: 0 })).toBe(2);
    expect(
      countPaperVoucherFilters({
        keyword: "lo",
        faceValue: 100000,
        status: "active",
        expiresAt: PAPER_VOUCHER_NO_EXPIRY_FILTER
      })
    ).toBe(4);
  });
});

describe("toPaperVoucherBatchFilterQuery", () => {
  it("maps popup filters to API query params", () => {
    expect(toPaperVoucherBatchFilterQuery({})).toEqual({});
    expect(
      toPaperVoucherBatchFilterQuery({
        keyword: "  lo-003 ",
        faceValue: 100000,
        status: "active",
        expiresAt: "2026-12-31"
      })
    ).toEqual({
      keyword: "lo-003",
      faceValue: 100000,
      status: "active",
      expiresFrom: "2026-12-31",
      expiresTo: "2026-12-31"
    });
    expect(
      toPaperVoucherBatchFilterQuery({ keyword: "   ", expiresAt: PAPER_VOUCHER_NO_EXPIRY_FILTER })
    ).toEqual({ noExpiry: true });
  });
});

describe("validatePaperVoucherBatchDto", () => {
  const dto = {
    name: "Lô mới",
    faceValue: 100000,
    totalQuantity: 10,
    validFrom: "2026-11-01",
    expiresAt: "2026-12-31"
  };

  it("accepts a valid batch", () => {
    expect(validatePaperVoucherBatchDto(dto)).toBeNull();
  });

  it("rejects non-positive face values and non-integer quantities", () => {
    expect(validatePaperVoucherBatchDto({ ...dto, faceValue: 0 })).toMatch(/Mệnh giá/);
    expect(validatePaperVoucherBatchDto({ ...dto, faceValue: -5000 })).toMatch(/Mệnh giá/);
    expect(validatePaperVoucherBatchDto({ ...dto, totalQuantity: 0 })).toMatch(/Số lượng/);
    expect(validatePaperVoucherBatchDto({ ...dto, totalQuantity: 2.5 })).toMatch(/Số lượng/);
  });

  it("accepts a batch without an expiry date", () => {
    expect(validatePaperVoucherBatchDto({ ...dto, expiresAt: null })).toBeNull();
    expect(
      validatePaperVoucherBatchDto({ ...dto, expiresAt: undefined, validFrom: null })
    ).toBeNull();
  });

  it("rejects invalid dates and expiry before start", () => {
    expect(validatePaperVoucherBatchDto({ ...dto, expiresAt: "2026-02-30" })).toMatch(
      /Ngày hết hạn/
    );
    expect(validatePaperVoucherBatchDto({ ...dto, expiresAt: "2026-10-31" })).toBe(
      "Ngày hết hạn không được trước ngày bắt đầu"
    );
  });

  it("protects history of batches that were already used", () => {
    const existing = makeBatch({ usedCount: 50, validFrom: "2026-11-01" });

    expect(validatePaperVoucherBatchDto({ ...dto, totalQuantity: 49 }, existing)).toMatch(
      /không được nhỏ hơn số đã sử dụng/
    );
    expect(
      validatePaperVoucherBatchDto({ ...dto, totalQuantity: 300, faceValue: 50000 }, existing)
    ).toMatch(/mệnh giá/);
    expect(
      validatePaperVoucherBatchDto(
        { ...dto, totalQuantity: 300, expiresAt: "2027-01-31" },
        existing
      )
    ).toMatch(/thời hạn/);
    expect(
      validatePaperVoucherBatchDto({ ...dto, name: "Đổi tên", totalQuantity: 300 }, existing)
    ).toBeNull();
  });
});

describe("comparePaperVoucherDate", () => {
  it("sorts by real dates and puts empty start dates first", () => {
    const values = ["2026-12-31", null, "2025-01-01", "2026-01-01"];

    expect([...values].sort(comparePaperVoucherDate)).toEqual([
      null,
      "2025-01-01",
      "2026-01-01",
      "2026-12-31"
    ]);
    expect(comparePaperVoucherDate(null, undefined)).toBe(0);
  });

  it("puts missing expiry dates last when treated as the latest date", () => {
    expect(
      [null, "2026-12-31", "2025-12-31"].sort((a, b) => comparePaperVoucherDate(a, b, "max"))
    ).toEqual(["2025-12-31", "2026-12-31", null]);
  });
});

describe("validatePaperVoucherImageFile", () => {
  it("accepts JPG, PNG and WebP up to 5 MB", () => {
    expect(validatePaperVoucherImageFile({ type: "image/jpeg", size: 1024 })).toBeNull();
    expect(validatePaperVoucherImageFile({ type: "image/webp", size: 5 * 1024 * 1024 })).toBeNull();
  });

  it("rejects other formats and oversized files", () => {
    expect(validatePaperVoucherImageFile({ type: "image/gif", size: 10 })).toMatch(/JPG, PNG/);
    expect(validatePaperVoucherImageFile({ type: "image/png", size: 5 * 1024 * 1024 + 1 })).toMatch(
      /5 MB/
    );
  });
});

describe("getPaperVoucherUsageStatusMeta", () => {
  it.each([
    ["applied", "Đã áp dụng", "success"],
    ["reversed", "Đã trả lại lô", "default"],
    ["cancelled", "Đã hủy, không dùng lại", "error"]
  ])("maps BE status %s to its label", (inputStatus, expectedLabel, expectedColor) => {
    expect(getPaperVoucherUsageStatusMeta(inputStatus)).toEqual({
      label: expectedLabel,
      color: expectedColor
    });
  });

  it("covers every usage status of the BE contract (10/20/30)", () => {
    expect(Object.keys(PAPER_VOUCHER_USAGE_STATUS_META).sort()).toEqual([
      "applied",
      "cancelled",
      "reversed"
    ]);
  });

  it.each([
    ["held", "Không xác định (held)"],
    ["toString", "Không xác định (toString)"],
    ["", "Không xác định"],
    [null, "Không xác định"],
    [undefined, "Không xác định"]
  ])("falls back for unknown status %p instead of throwing", (inputStatus, expectedLabel) => {
    expect(getPaperVoucherUsageStatusMeta(inputStatus)).toEqual({
      label: expectedLabel,
      color: "warning"
    });
  });
});
