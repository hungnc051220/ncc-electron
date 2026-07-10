import { ListSeat, OrderResponseProps, OrderStatus, PaymentStatus } from "@shared/types";
import { describe, expect, it } from "vitest";
import {
  buildCancelOrderSelection,
  buildSeatOrderMap,
  findSeatOrder,
  formatCancelSeatList
} from "./cancelOrderSelection";

const createSeat = (seat: string, code: string, floor = 1): ListSeat => ({
  seat,
  code,
  floor,
  rows: 1,
  column: Number(seat),
  y: 1,
  type: 0,
  status: 1,
  price: 100000,
  checkinStatus: 0,
  isInvitation: 0,
  isContract: 0,
  isHold: 0,
  positionName: "Thường"
});

const createOrder = (overrides: Partial<OrderResponseProps> = {}) =>
  ({
    id: 101,
    deleted: false,
    createdOnUtc: "2026-07-10T08:00:00.000Z",
    orderStatusId: OrderStatus.COMPLETED,
    paymentStatusId: PaymentStatus.PAID,
    items: [
      {
        planScreenId: 9,
        listChairIndexF1: "1, 2",
        listChairValueF1: "A1, A2",
        listChairIndexF2: "",
        listChairValueF2: "",
        listChairIndexF3: "",
        listChairValueF3: ""
      }
    ],
    ...overrides
  }) as OrderResponseProps;

describe("cancelOrderSelection", () => {
  it("maps a clicked seat to its order and selects every seat in that order", () => {
    const seats = [createSeat("1", "A1"), createSeat("2", "A2")];
    const order = createOrder();
    const map = buildSeatOrderMap([order], 9);

    expect(findSeatOrder(seats[0], map)?.id).toBe(101);
    expect(
      buildCancelOrderSelection({
        order,
        seats,
        planScreeningId: 9,
        directSeatKey: "1-1"
      })
    ).toMatchObject({
      orderId: 101,
      directSeatKey: "1-1",
      seatKeys: ["1-1", "1-2"],
      isComplete: true
    });
  });

  it("marks the selection incomplete when the order contains an unknown seat", () => {
    const selection = buildCancelOrderSelection({
      order: createOrder(),
      seats: [createSeat("1", "A1")],
      planScreeningId: 9,
      directSeatKey: "1-1"
    });

    expect(selection.isComplete).toBe(false);
    expect(selection.seatKeys).toEqual(["1-1"]);
  });

  it("formats seats in floor and position order", () => {
    expect(formatCancelSeatList([createSeat("2", "B2", 2), createSeat("1", "A1")])).toBe(
      "A1, T2-B2"
    );
  });
});
