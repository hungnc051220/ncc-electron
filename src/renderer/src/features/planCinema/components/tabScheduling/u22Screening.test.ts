import type { PlanPricingProps, PricingRules } from "@shared/types";
import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import {
  getU22CheckboxState,
  getScreeningU22Status,
  getU22PolicyInvalidMessage,
  U22_NOT_2D_MESSAGE,
  U22_PROMOTION_EXCLUDED_MESSAGE,
  U22_SCHEMA_MISSING_MESSAGE,
  U22_UNIFORM_PRICE_MESSAGE,
  type U22CheckboxInput
} from "./u22Screening";

const RULES: PricingRules = {
  ruleVersion: "holiday-v3.2",
  schema: { holidayPriceMode: true, promotionExclusion: true, screeningPolicy: true },
  ready: true,
  enforcedPolicies: ["U22"]
};

const NORMAL_DAY: PlanPricingProps = {
  dayPartId: 7,
  pricings: { T: 80000, V: 85000 },
  baseDateTypeId: 1,
  isHoliday: false,
  isPromotionExcluded: false,
  pricingReason: "BASE"
};

const input = (overrides: Partial<U22CheckboxInput> = {}): U22CheckboxInput => ({
  rules: RULES,
  isRulesLoading: false,
  isPricingReady: true,
  pricing: NORMAL_DAY,
  versionCode: "2D",
  isUniform: false,
  userChoice: null,
  ...overrides
});

const axiosError = (status: number, data: unknown) =>
  new AxiosError("Request failed", String(status), undefined, undefined, {
    status,
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
    data
  });

describe("getU22CheckboxState (Áp dụng ưu đãi U22 khi thêm ca chiếu)", () => {
  it("2D on a normal day: shown, ON by default, editable", () => {
    expect(getU22CheckboxState(input())).toEqual({
      visible: true,
      submit: true,
      checked: true,
      disabled: false,
      reason: null,
      undetermined: false
    });
  });

  it("the user turns it off then on again manually", () => {
    expect(getU22CheckboxState(input({ userChoice: false })).checked).toBe(false);
    expect(getU22CheckboxState(input({ userChoice: true })).checked).toBe(true);
  });

  it("Đồng giá: OFF and locked with the uniform-price reason", () => {
    const actual = getU22CheckboxState(input({ isUniform: true, userChoice: true }));

    expect(actual).toMatchObject({
      checked: false,
      disabled: true,
      reason: U22_UNIFORM_PRICE_MESSAGE
    });
  });

  it("leaving Đồng giá restores the previous choice and never re-enables a choice the user turned off", () => {
    expect(getU22CheckboxState(input({ isUniform: false, userChoice: null })).checked).toBe(true);
    expect(getU22CheckboxState(input({ isUniform: false, userChoice: false })).checked).toBe(false);
  });

  it.each([
    [
      "holiday",
      { ...NORMAL_DAY, isHoliday: true, holidayName: "Ngày văn hóa" },
      "Ngày lễ (Ngày văn hóa): không áp dụng ưu đãi U22."
    ],
    [
      "holiday priced by weekday (20/10)",
      {
        ...NORMAL_DAY,
        isHoliday: true,
        holidayName: "Phụ nữ Việt Nam",
        applyHolidayPrice: false,
        pricingReason: "BASE" as const
      },
      "Ngày lễ (Phụ nữ Việt Nam): không áp dụng ưu đãi U22."
    ],
    [
      "promotion-excluded day",
      { ...NORMAL_DAY, isPromotionExcluded: true },
      U22_PROMOTION_EXCLUDED_MESSAGE
    ]
  ])("%s: OFF and locked even if the user wanted it", (_label, pricing, expectedReason) => {
    const actual = getU22CheckboxState(input({ pricing, userChoice: true }));

    expect(actual).toMatchObject({ checked: false, disabled: true, reason: expectedReason });
  });

  it.each(["3D", "4D", "IMAX 3D"])("version %s: OFF and locked (U22 is 2D only)", (versionCode) => {
    expect(getU22CheckboxState(input({ versionCode }))).toMatchObject({
      checked: false,
      disabled: true,
      reason: U22_NOT_2D_MESSAGE
    });
  });

  it("an early screening (before the film premiere) is not switched off: the checkbox ignores premiere dates", () => {
    // Không có trường suất chiếu sớm trong input: suất 2D ngày thường của phim chưa khởi chiếu vẫn mặc định BẬT.
    expect(getU22CheckboxState(input({ versionCode: "2D" })).checked).toBe(true);
  });

  it("while plan-pricing or the rules are loading: no conclusion, save blocked", () => {
    expect(getU22CheckboxState(input({ isPricingReady: false }))).toMatchObject({
      checked: false,
      disabled: true,
      undetermined: true
    });
    expect(getU22CheckboxState(input({ rules: undefined, isRulesLoading: true }))).toMatchObject({
      visible: false,
      undetermined: true
    });
    expect(getU22CheckboxState(input({ versionCode: undefined })).undetermined).toBe(true);
  });

  it("old backend (rules 404): hidden, nothing to send, not blocking", () => {
    expect(getU22CheckboxState(input({ rules: null }))).toMatchObject({
      visible: false,
      submit: false,
      undetermined: false
    });
  });

  it.each([
    [
      "no policy table",
      { ...RULES, ready: false, schema: { ...RULES.schema, screeningPolicy: false } }
    ],
    ["schema not ready", { ...RULES, ready: false }]
  ])("%s: shown, locked with the compatibility error, never sent", (_label, rules) => {
    expect(getU22CheckboxState(input({ rules, userChoice: true }))).toEqual({
      visible: true,
      submit: false,
      checked: false,
      disabled: true,
      reason: U22_SCHEMA_MISSING_MESSAGE,
      undetermined: false
    });
  });

  it("every rule is enforced: no 'not applied at sale' note exists any more", () => {
    expect(JSON.stringify(getU22CheckboxState(input()))).not.toMatch(/chưa áp dụng khi bán/);
  });
});

describe("getU22PolicyInvalidMessage", () => {
  it.each([
    ["UNIFORM_PRICE", U22_UNIFORM_PRICE_MESSAGE],
    ["HOLIDAY", "Ngày chiếu là ngày lễ: không áp dụng ưu đãi U22."],
    ["PROMOTION_EXCLUDED", U22_PROMOTION_EXCLUDED_MESSAGE],
    ["UNSUPPORTED_VERSION", U22_NOT_2D_MESSAGE]
  ])("400 U22_SCREENING_POLICY_INVALID reason %s", (reason, expectedStart) => {
    const error = axiosError(400, { code: "U22_SCREENING_POLICY_INVALID", details: { reason } });

    expect(getU22PolicyInvalidMessage(error)).toBe(
      `${expectedStart} Đã tải lại thông tin, vui lòng kiểm tra lựa chọn ưu đãi U22.`
    );
  });

  it("503 U22_SCREENING_POLICY_SCHEMA_MISSING: compatibility error, nothing saved", () => {
    const error = axiosError(503, { code: "U22_SCREENING_POLICY_SCHEMA_MISSING" });

    expect(getU22PolicyInvalidMessage(error)).toBe(
      `${U22_SCHEMA_MISSING_MESSAGE} Chưa lưu thay đổi.`
    );
  });

  it("other errors are not handled here", () => {
    expect(getU22PolicyInvalidMessage(axiosError(409, { code: "PRICING_STALE" }))).toBeNull();
  });
});

describe("getScreeningU22Status (cột Ưu đãi U22 ở tab Giờ chiếu)", () => {
  const listOn = {
    source: "SCREENING_POLICY" as const,
    u22Enabled: true,
    priceMode: "LIST" as const
  };
  const listOff = { ...listOn, u22Enabled: false };
  const ordinaryDay = { isHoliday: false, isPromotionExcluded: false };

  it("old backend (no u22Policy): nothing to show", () => {
    expect(
      getScreeningU22Status({ policy: undefined, day: ordinaryDay, versionCode: "2D" })
    ).toBeNull();
  });

  it("policy unreadable: Chưa xác định, no action", () => {
    expect(
      getScreeningU22Status({
        policy: { source: "UNAVAILABLE", u22Enabled: null, priceMode: null },
        day: ordinaryDay,
        versionCode: "2D"
      })
    ).toMatchObject({ label: "Chưa xác định", tone: "default", action: null });
  });

  it("2D screening with U22 on, ordinary day: Có thể áp dụng, action Tắt", () => {
    expect(getScreeningU22Status({ policy: listOn, day: ordinaryDay, versionCode: "2D" })).toEqual({
      label: "Có thể áp dụng",
      tone: "success",
      tooltip: "Suất chiếu được phép xét U22 nếu khách hàng đáp ứng các điều kiện.",
      reason: null,
      action: "disable"
    });
  });

  it("legacy screening (no stored setting) keeps the current rule: Có thể áp dụng", () => {
    expect(
      getScreeningU22Status({
        policy: { source: "LEGACY_UNSPECIFIED", u22Enabled: null, priceMode: null },
        day: ordinaryDay,
        versionCode: "2D"
      })
    ).toMatchObject({ label: "Có thể áp dụng", action: "disable" });
  });

  it("switched off by the manager on a valid screening: Không áp dụng (warning), action Bật lại", () => {
    expect(
      getScreeningU22Status({ policy: listOff, day: ordinaryDay, versionCode: "2D" })
    ).toMatchObject({
      label: "Không áp dụng",
      tone: "warning",
      action: "enable"
    });
  });

  it.each([
    [
      "holiday (whatever its price)",
      { isHoliday: true, isPromotionExcluded: false },
      listOff,
      "2D",
      "Ngày lễ"
    ],
    [
      "promotion-excluded day",
      { isHoliday: false, isPromotionExcluded: true },
      listOff,
      "2D",
      "Ngày không áp U22"
    ],
    ["Đồng giá", ordinaryDay, { ...listOff, priceMode: "UNIFORM" as const }, "2D", "Đồng giá"],
    ["3D film", ordinaryDay, listOff, "3D", "Không hỗ trợ 3D"]
  ])(
    "mandatory block %s: Không áp dụng (error) with its reason and NO enable action",
    (_label, day, policy, versionCode, reason) => {
      expect(getScreeningU22Status({ policy, day, versionCode })).toMatchObject({
        label: "Không áp dụng",
        tone: "error",
        reason,
        action: null
      });
    }
  );

  it("MANUAL price is not Đồng giá: U22 stays applicable", () => {
    expect(
      getScreeningU22Status({
        policy: { ...listOn, priceMode: "MANUAL" },
        day: ordinaryDay,
        versionCode: "2D"
      })
    ).toMatchObject({ label: "Có thể áp dụng", action: "disable" });
  });

  it("missing day policy or film version: Chưa xác định instead of a guessed Có thể áp dụng", () => {
    expect(
      getScreeningU22Status({ policy: listOn, day: undefined, versionCode: "2D" })
    ).toMatchObject({
      label: "Chưa xác định",
      action: null
    });
    expect(
      getScreeningU22Status({
        policy: listOn,
        day: { isHoliday: false, isPromotionExcluded: null },
        versionCode: "2D"
      })
    ).toMatchObject({ label: "Chưa xác định", action: null });
    expect(
      getScreeningU22Status({ policy: listOn, day: ordinaryDay, versionCode: undefined })
    ).toMatchObject({
      label: "Chưa xác định",
      action: null
    });
  });

  it("a known 2D version never shows Chưa xác định when the day is known (IMAX_2D included)", () => {
    expect(
      getScreeningU22Status({ policy: listOn, day: ordinaryDay, versionCode: "IMAX_2D" })
    ).toMatchObject({
      label: "Có thể áp dụng"
    });
  });
});
