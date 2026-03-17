import { describe, expect, it } from "vitest";
import { DiscountProps, ListSeat } from "@shared/types";
import { buildSeatFieldsByFloor, calculateSeatDiscount, getSeatDiscountKey } from "./Actions";

const createSeat = (overrides: Partial<ListSeat> = {}): ListSeat => ({
  seat: "A1",
  rows: 1,
  column: 1,
  y: 1,
  code: "A1",
  type: 0,
  status: 0,
  floor: 1,
  price: 100000,
  checkinStatus: 0,
  isInvitation: 0,
  isContract: 0,
  isHold: 0,
  positionId: 1,
  positionName: "Thuong",
  ...overrides
});

const createDiscount = (overrides: Partial<DiscountProps> = {}): DiscountProps => ({
  id: 1,
  discountName: "Khuyen mai",
  discountType: "PROMO",
  discountAmount: 0,
  discountRate: 0,
  deleted: false,
  createdOnUtc: "2026-03-16T00:00:00.000Z",
  createdUser: "tester",
  updatedOnUtc: "2026-03-16T00:00:00.000Z",
  updatedUser: "tester",
  ...overrides
});

describe("plan screening action helpers", () => {
  it("builds seat keys from floor and seat index", () => {
    expect(getSeatDiscountKey(createSeat({ floor: 2, seat: "15" }))).toBe("2-15");
  });

  it("builds seat fields grouped by floor", () => {
    const result = buildSeatFieldsByFloor([
      createSeat({ floor: 1, seat: "1", code: "A1" }),
      createSeat({ floor: 1, seat: "2", code: "A2" }),
      createSeat({ floor: 3, seat: "7", code: "C7" })
    ]);

    expect(result).toEqual({
      listChairIndexF1: "1,2",
      listChairValueF1: "A1,A2",
      listChairIndexF3: "7",
      listChairValueF3: "C7"
    });
  });

  it("calculates percentage discount per seat", () => {
    const discount = createDiscount({ discountRate: 25 });

    expect(calculateSeatDiscount(createSeat({ price: 120000 }), discount)).toBe(30000);
  });

  it("calculates fixed discount per seat", () => {
    const discount = createDiscount({ discountAmount: 15000 });

    expect(calculateSeatDiscount(createSeat({ price: 120000 }), discount)).toBe(15000);
  });

  it("does not allow discount to exceed seat total", () => {
    const seat = createSeat({ price: 9000 });

    expect(calculateSeatDiscount(seat, createDiscount({ discountAmount: 15000 }))).toBe(9000);
    expect(calculateSeatDiscount(seat, createDiscount({ discountRate: 200 }))).toBe(9000);
  });

  it("returns zero when no discount is applied", () => {
    expect(calculateSeatDiscount(createSeat(), undefined)).toBe(0);
  });
});
