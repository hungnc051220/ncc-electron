import { describe, expect, it } from "vitest";
import {
  isValidPointRedemptionIncrement,
  roundPointRedemptionLimitDown,
  roundPointRedemptionLimitUp
} from "./vipCardPointRedemption";

describe("vipCardPointRedemption", () => {
  it("only accepts whole thousand point increments", () => {
    expect(isValidPointRedemptionIncrement(5000)).toBe(true);
    expect(isValidPointRedemptionIncrement(6000)).toBe(true);
    expect(isValidPointRedemptionIncrement(5001)).toBe(false);
    expect(isValidPointRedemptionIncrement(5069)).toBe(false);
  });

  it("aligns redemption limits to whole thousand point increments", () => {
    expect(roundPointRedemptionLimitUp(5001)).toBe(6000);
    expect(roundPointRedemptionLimitDown(6069)).toBe(6000);
  });
});
