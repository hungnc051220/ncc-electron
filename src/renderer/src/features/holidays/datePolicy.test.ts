import type { HolidayProps, PricingRules } from "@shared/types";
import { describe, expect, it } from "vitest";
import {
  describeHolidayPriceChoice,
  getDayDisplayName,
  getDayU22Policy,
  getHolidayPriceModeLabel,
  getTicketPriceGroup,
  isRulesReady
} from "./datePolicy";

const RULES: PricingRules = {
  ruleVersion: "holiday-v3.2",
  schema: { holidayPriceMode: true, promotionExclusion: true, screeningPolicy: true },
  ready: true,
  enforcedPolicies: ["U22"]
};

const day = (overrides: Partial<HolidayProps>) => ({
  dateValue: "2026-11-24",
  dateTypeId: 1,
  isHoliday: false,
  holidayName: null,
  applyHolidayPrice: null,
  isPromotionExcluded: false,
  ...overrides
});

// Ví dụ NCC (2026, mẫu A: T2–T5 ngày thường, T6–CN cuối tuần).
const NCC_2026 = {
  newYear: day({ dateValue: "2026-01-01", isHoliday: true, applyHolidayPrice: true }),
  oct20: day({ dateValue: "2026-10-20", isHoliday: true, applyHolidayPrice: false }),
  oct31: day({ dateValue: "2026-10-31", dateTypeId: 2, isHoliday: true, applyHolidayPrice: false }),
  nov20: day({ dateValue: "2026-11-20", dateTypeId: 2, isHoliday: true, applyHolidayPrice: false }),
  nov24: day({ dateValue: "2026-11-24", isHoliday: true, applyHolidayPrice: true })
};

// Không được ngụ ý hệ thống chặn mọi ưu đãi (phạm vi V3.2 chỉ U22).
const CLAIMS_ALL_PROMOTIONS =
  /mọi (ưu đãi|chương trình)|tất cả (ưu đãi|khuyến)|khuyến mại khác đã/i;

describe("getTicketPriceGroup (Giá vé theo cấu hình từng ngày)", () => {
  it.each([
    ["01/01 holiday, Giá ngày lễ", NCC_2026.newYear, "Giá ngày lễ"],
    ["20/10/2026 (Thứ 3) holiday, Theo ngày trong tuần", NCC_2026.oct20, "Giá ngày thường"],
    ["31/10/2026 (Thứ 7) holiday, Theo ngày trong tuần", NCC_2026.oct31, "Giá cuối tuần"],
    ["20/11/2026 (Thứ 6) holiday, Theo ngày trong tuần", NCC_2026.nov20, "Giá cuối tuần"],
    ["24/11/2026 (Thứ 3) holiday, Giá ngày lễ", NCC_2026.nov24, "Giá ngày lễ"],
    ["normal day", day({}), "Giá ngày thường"],
    ["weekend day", day({ dateTypeId: 2 }), "Giá cuối tuần"],
    [
      "promotion-excluded weekday keeps its base price",
      day({ isPromotionExcluded: true }),
      "Giá ngày thường"
    ],
    [
      "applyHolidayPrice has no effect on a non-holiday",
      day({ dateTypeId: 1, applyHolidayPrice: true }),
      "Giá ngày thường"
    ]
  ])("%s", (_label, input, expected) => {
    expect(getTicketPriceGroup(input).label).toBe(expected);
  });

  it("20/10 and 31/10 are both holidays yet have different prices", () => {
    expect(getTicketPriceGroup(NCC_2026.oct20).label).not.toBe(
      getTicketPriceGroup(NCC_2026.oct31).label
    );
  });

  it("holiday whose price mode could not be read: no guess", () => {
    expect(getTicketPriceGroup(day({ isHoliday: true, applyHolidayPrice: null }))).toMatchObject({
      label: null,
      tone: "unknown"
    });
    expect(getTicketPriceGroup(day({ isHoliday: true, applyHolidayPrice: undefined })).label).toBe(
      null
    );
  });
});

describe("describeHolidayPriceChoice (preview trong dialog Chỉnh sửa ngày lễ)", () => {
  it("Giá ngày lễ", () => {
    expect(describeHolidayPriceChoice(NCC_2026.oct20, true)).toBe("Áp dụng giá ngày lễ.");
  });

  it("Theo ngày trong tuần follows the base classification and the weekday", () => {
    expect(describeHolidayPriceChoice(NCC_2026.oct20, false)).toBe(
      "Thứ 3 — Áp dụng giá ngày thường."
    );
    expect(describeHolidayPriceChoice(NCC_2026.oct31, false)).toBe(
      "Thứ 7 — Áp dụng giá cuối tuần."
    );
    expect(describeHolidayPriceChoice(NCC_2026.nov20, false)).toBe(
      "Thứ 6 — Áp dụng giá cuối tuần."
    );
  });

  it("price mode labels", () => {
    expect(getHolidayPriceModeLabel(true)).toBe("Giá ngày lễ");
    expect(getHolidayPriceModeLabel(false)).toBe("Theo ngày trong tuần");
    expect(getHolidayPriceModeLabel(null)).toBeNull();
  });
});

describe("getDayU22Policy", () => {
  it("removing the holiday price never re-enables U22", () => {
    for (const holiday of [NCC_2026.oct20, NCC_2026.oct31, NCC_2026.nov20]) {
      expect(getDayU22Policy(holiday)).toMatchObject({ label: "Không áp dụng", blocked: true });
    }
    expect(getDayU22Policy(NCC_2026.nov24)).toMatchObject({ label: "Không áp dụng" });
  });

  it("promotion-excluded day blocks U22 and stays a base-priced day", () => {
    const excluded = day({ isPromotionExcluded: true });
    const actual = getDayU22Policy(excluded);

    expect(actual).toEqual({
      label: "Không áp dụng",
      blocked: true,
      reason: "Ngày không áp ưu đãi"
    });
    expect(JSON.stringify(actual)).not.toMatch(CLAIMS_ALL_PROMOTIONS);
  });

  it("unreadable promotion flag: undetermined (the server refuses U22)", () => {
    expect(getDayU22Policy(day({ isPromotionExcluded: null }))).toMatchObject({
      label: "Không xác định",
      blocked: null
    });
  });

  it("normal day: allowed under conditions", () => {
    expect(getDayU22Policy(day({}))).toMatchObject({
      label: "Cho phép theo điều kiện",
      blocked: false
    });
  });
});

describe("getDayDisplayName / isRulesReady", () => {
  it("only the stored holiday name", () => {
    expect(getDayDisplayName(day({ isHoliday: true, holidayName: " Ngày văn hóa " }))).toBe(
      "Ngày văn hóa"
    );
    expect(getDayDisplayName(day({ isPromotionExcluded: true }))).toBeNull();
  });

  it("new operations need the whole V3.2 schema", () => {
    expect(isRulesReady(RULES)).toBe(true);
    expect(isRulesReady({ ...RULES, ready: false })).toBe(false);
    expect(isRulesReady(null)).toBe(false);
  });
});
