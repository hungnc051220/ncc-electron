import { describe, expect, it } from "vitest";
import {
  getChangedDays,
  getGroupPrice,
  getInvalidDays,
  getOverwrites,
  hasCustomPrices,
  isValidU22Price,
  toU22WeekPrices,
  U22_GROUPS,
  type U22DraftPrices
} from "./u22PriceGroups";

const SEED: U22DraftPrices = {
  priceMon: 55000,
  priceTue: 55000,
  priceWed: 55000,
  priceThu: 55000,
  priceFri: 70000,
  priceSat: 70000,
  priceSun: 70000
};
const [WEEKDAY, WEEKEND] = U22_GROUPS;

describe("u22PriceGroups", () => {
  it("reads the two group prices of the seed", () => {
    expect(getGroupPrice(SEED, WEEKDAY)).toBe(55000);
    expect(getGroupPrice(SEED, WEEKEND)).toBe(70000);
    expect(hasCustomPrices(SEED)).toBe(false);
  });

  it("marks a group with a weekday-specific price as custom", () => {
    const inputPrices = { ...SEED, priceSat: 90000 };

    expect(getGroupPrice(inputPrices, WEEKEND)).toBeNull();
    expect(hasCustomPrices(inputPrices)).toBe(true);
  });

  it("lists the weekdays a group price would overwrite", () => {
    const inputPrices = { ...SEED, priceFri: 80000, priceSat: 90000, priceSun: 90000 };

    expect(getOverwrites(inputPrices, WEEKEND, 90000)).toEqual([
      { day: "priceFri", from: 80000, to: 90000 }
    ]);
  });

  it("lists the changed days against the saved prices", () => {
    expect(getChangedDays(SEED, { ...SEED, priceFri: 80000, priceSun: 80000 })).toEqual([
      "priceFri",
      "priceSun"
    ]);
  });

  it.each([
    [1000, true],
    [1000000, true],
    [55000, true],
    [999, false],
    [1000001, false],
    [55500, false],
    [null, false]
  ])("isValidU22Price(%p) = %p (same rule as the backend)", (inputPrice, expected) => {
    expect(isValidU22Price(inputPrice)).toBe(expected);
  });

  it("reports empty or invalid days and builds the API body", () => {
    expect(getInvalidDays({ ...SEED, priceMon: null, priceSun: 55500 })).toEqual([
      "priceMon",
      "priceSun"
    ]);
    expect(toU22WeekPrices(SEED)).toEqual(SEED);
  });
});
