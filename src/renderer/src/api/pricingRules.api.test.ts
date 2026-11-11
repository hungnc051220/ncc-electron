import { initApi } from "@renderer/api/client";
import { server } from "@renderer/test/msw/server";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { normalizePricingRules, pricingRulesApi } from "./pricingRules.api";

const API = "http://pricing-rules.test";

const V32_RULES = {
  ruleVersion: "holiday-v3.2",
  schema: { holidayPriceMode: true, promotionExclusion: true, screeningPolicy: true },
  ready: true,
  enforcedPolicies: ["U22"]
};

describe("pricingRulesApi", () => {
  beforeEach(async () => {
    await initApi(API);
  });

  it("old backend (404) → null: FE hides every new feature", async () => {
    expect(await pricingRulesApi.get()).toBeNull();
  });

  it("V3.2 backend → capability contract, no feature flag fields", async () => {
    server.use(http.get(`${API}/api/pos/pricing/rules`, () => HttpResponse.json(V32_RULES)));

    const actual = await pricingRulesApi.get();

    expect(actual).toEqual(V32_RULES);
    expect(Object.keys(actual ?? {})).not.toEqual(
      expect.arrayContaining(["holidayPricePriority", "repricing", "u22ScreeningPolicy"])
    );
  });

  it("other errors are thrown (not mistaken for an old backend)", async () => {
    server.use(
      http.get(`${API}/api/pos/pricing/rules`, () =>
        HttpResponse.json({ message: "boom" }, { status: 500 })
      )
    );

    await expect(pricingRulesApi.get()).rejects.toThrow();
  });

  it("missing or malformed fields mean 'not available'", () => {
    expect(normalizePricingRules({ enforcedPolicies: "U22", ready: "yes" })).toEqual({
      ruleVersion: "",
      schema: { holidayPriceMode: false, promotionExclusion: false, screeningPolicy: false },
      ready: false,
      enforcedPolicies: []
    });
  });

  it("ready is never trusted when a schema part is missing", () => {
    const actual = normalizePricingRules({
      ...V32_RULES,
      schema: { ...V32_RULES.schema, holidayPriceMode: false }
    });

    expect(actual.ready).toBe(false);
    expect(actual.schema.holidayPriceMode).toBe(false);
  });
});
