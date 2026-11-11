import type { PlanPricingProps } from "@shared/types";
import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import {
  buildStaleComparisonRows,
  getPlanPricingErrorMessage,
  getPlanPricingReason,
  getPricingBlockReason,
  getPricingStaleDetails,
  isPlanPricingReady,
  resolvePriceMode
} from "./planPricing";

const HOLIDAY_PRICING: PlanPricingProps = {
  dayPartId: 17,
  pricings: { D: 100000, T: 90000, V: 95000 },
  baseDateTypeId: 1,
  isHoliday: true,
  holidayName: "Ngày văn hóa",
  applyHolidayPrice: true,
  isPromotionExcluded: false,
  effectiveDateTypeId: 2,
  pricingReason: "HOLIDAY",
  dayPartName: "Ngày lễ - Từ 17h đến trước 23:00",
  pricingVersion: "3f2a9c0d1b7e4a55"
};

const LIST = {
  priceOfPosition1: { seatType: "D", price: 100000 },
  priceOfPosition2: { seatType: "T", price: 90000 },
  priceOfPosition3: { seatType: "V", price: 95000 }
};

const axiosError = (status: number, data: unknown) =>
  new AxiosError("Request failed", String(status), undefined, undefined, {
    status,
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
    data
  });

describe("getPlanPricingReason", () => {
  it("24/11/2026 (Thứ 3, ngày lễ, Giá ngày lễ): holiday price with the day part", () => {
    expect(getPlanPricingReason(HOLIDAY_PRICING)).toBe(
      "Ngày lễ: Ngày văn hóa — áp dụng giá ngày lễ · Khung: Ngày lễ - Từ 17h đến trước 23:00 · Không áp U22"
    );
  });

  it("20/10/2026 (Thứ 3) holiday priced by weekday: weekday price, still no U22", () => {
    expect(
      getPlanPricingReason({
        ...HOLIDAY_PRICING,
        holidayName: "Phụ nữ Việt Nam",
        applyHolidayPrice: false,
        effectiveDateTypeId: 1,
        pricingReason: "BASE",
        dayPartName: "Ngày thường - Từ 17h đến 23:00"
      })
    ).toBe(
      "Ngày lễ: Phụ nữ Việt Nam — theo giá ngày thường · Khung: Ngày thường - Từ 17h đến 23:00 · Không áp U22"
    );
  });

  it("31/10/2026 (Thứ 7) holiday priced by weekday: weekend price", () => {
    expect(
      getPlanPricingReason({
        ...HOLIDAY_PRICING,
        holidayName: "Halloween",
        baseDateTypeId: 2,
        applyHolidayPrice: false,
        pricingReason: "BASE",
        dayPartName: undefined
      })
    ).toBe("Ngày lễ: Halloween — theo giá cuối tuần · Không áp U22");
  });

  it("weekend and promotion-excluded days", () => {
    expect(
      getPlanPricingReason({
        dayPartId: 17,
        pricings: {},
        baseDateTypeId: 2,
        isHoliday: false,
        isPromotionExcluded: false,
        pricingReason: "BASE",
        dayPartName: "Ngày lễ - Từ 17h đến trước 23:00"
      })
    ).toBe("Cuối tuần — giá theo phân loại ngày · Khung: Ngày lễ - Từ 17h đến trước 23:00");
    expect(
      getPlanPricingReason({
        dayPartId: 7,
        pricings: {},
        baseDateTypeId: 1,
        isHoliday: false,
        isPromotionExcluded: true,
        pricingReason: "BASE"
      })
    ).toBe("Ngày thường — giá theo phân loại ngày · Không áp U22");
  });

  it("old backend (no pricingReason): no claim", () => {
    expect(getPlanPricingReason({ dayPartId: 7, pricings: { T: 80000 } })).toBeNull();
  });
});

describe("plan-pricing errors (no 0đ fallback)", () => {
  it.each([
    ["PRICING_DAY_PART_AMBIGUOUS", 400, /Có nhiều khung giờ cùng chứa giờ chiếu này/],
    ["HOLIDAY_PRICE_MODE_UNAVAILABLE", 503, /Không đọc được giá vé áp dụng của ngày lễ này/],
    ["PRICING_DAY_PART_NOT_CONFIGURED", 400, /Chưa có khung giờ nào chứa giờ chiếu này/]
  ])("%s → clear message and save blocked", (code, status, expected) => {
    const actual = getPlanPricingErrorMessage(axiosError(status, { code, message: "x" }));

    expect(actual).toMatch(expected);
    expect(actual).toMatch(/Chưa thể lưu ca chiếu\.$/);
    expect(
      getPricingBlockReason({
        isQueryEnabled: true,
        isFetching: false,
        isPlaceholderData: false,
        isError: true,
        hasPricing: false,
        errorMessage: actual
      })
    ).toBe(actual);
  });

  it("unknown errors keep the backend message", () => {
    expect(
      getPlanPricingErrorMessage(axiosError(400, { code: "OTHER", message: "Lỗi khác" }))
    ).toBe("Lỗi khác");
  });
});

describe("save gating while pricing loads", () => {
  const ready = {
    isQueryEnabled: true,
    isFetching: false,
    isPlaceholderData: false,
    isError: false,
    hasPricing: true
  };

  it.each([
    ["fetching", { isFetching: true }, "Đang tải giá vé…"],
    ["placeholder (previous price)", { isPlaceholderData: true }, "Đang tải giá vé…"],
    ["error", { isError: true }, "Chưa lấy được giá vé, chưa thể lưu ca chiếu."],
    [
      "no list price",
      { hasPricing: false },
      "Phòng/phiên bản này chưa có giá vé, chưa thể lưu ca chiếu."
    ]
  ])("%s → blocked", (_label, overrides, expectedReason) => {
    expect(isPlanPricingReady({ ...ready, ...overrides })).toBe(false);
    expect(getPricingBlockReason({ ...ready, ...overrides })).toBe(expectedReason);
  });

  it("ready → allowed", () => {
    expect(isPlanPricingReady(ready)).toBe(true);
    expect(getPricingBlockReason(ready)).toBeNull();
  });
});

describe("resolvePriceMode (payload priceMode)", () => {
  const listValues = { priceOfPosition1: 100000, priceOfPosition2: 90000, priceOfPosition3: 95000 };

  it("list prices → LIST", () => {
    expect(resolvePriceMode("LIST", listValues, LIST)).toBe("LIST");
  });

  it("edited prices → MANUAL", () => {
    expect(resolvePriceMode("MANUAL", listValues, LIST)).toBe("MANUAL");
    expect(resolvePriceMode("LIST", { ...listValues, priceOfPosition2: 85000 }, LIST)).toBe(
      "MANUAL"
    );
  });

  it("Đồng giá → UNIFORM (not inferred from equal prices)", () => {
    expect(resolvePriceMode("LIST", { priceOfPosition1: 50000 }, LIST, true)).toBe("UNIFORM");
    expect(resolvePriceMode("MANUAL", listValues, LIST, true)).toBe("UNIFORM");
    const equalPrices = {
      priceOfPosition1: 90000,
      priceOfPosition2: 90000,
      priceOfPosition3: 90000
    };
    expect(resolvePriceMode("MANUAL", equalPrices, LIST)).toBe("MANUAL");
  });
});

describe("409 PRICING_STALE", () => {
  it("reads details and compares requested vs current prices", () => {
    const error = axiosError(409, {
      code: "PRICING_STALE",
      details: {
        requested: {
          daypartId: 7,
          priceOfPosition1: "D:90000",
          priceOfPosition2: "T:80000",
          priceOfPosition3: "V:85000",
          priceOfPosition4: ""
        },
        current: HOLIDAY_PRICING
      }
    });

    const details = getPricingStaleDetails(error)!;

    expect(details.current?.pricingVersion).toBe("3f2a9c0d1b7e4a55");
    expect(buildStaleComparisonRows(details.requested!, details.current)).toEqual([
      { seatType: "D", requested: "90,000", current: "100,000", changed: true },
      { seatType: "T", requested: "80,000", current: "90,000", changed: true },
      { seatType: "V", requested: "85,000", current: "95,000", changed: true }
    ]);
  });

  it("other errors are not stale", () => {
    expect(getPricingStaleDetails(axiosError(400, { code: "PRICE_NOT_CONFIGURED" }))).toBeNull();
  });
});
