import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ListSeat } from "@shared/types";
import Seat from "./Seat";

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

const renderSeat = (overrides: Partial<ComponentProps<typeof Seat>> = {}) => {
  const onSelect = vi.fn();
  render(
    <Seat
      seat={createSeat()}
      isSelected={false}
      onSelect={onSelect}
      size={40}
      canSelect
      {...overrides}
    />
  );

  return {
    onSelect,
    seatElement: screen.getByText("A1").closest("div") as HTMLDivElement
  };
};

describe("Seat", () => {
  it("calls onSelect when the seat can be selected", () => {
    const { onSelect, seatElement } = renderSeat();

    fireEvent.click(seatElement);

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ code: "A1" }));
  });

  it("does not select a seat when selection is disabled", () => {
    const { onSelect, seatElement } = renderSeat({ canSelect: false });

    fireEvent.click(seatElement);

    expect(onSelect).not.toHaveBeenCalled();
    expect(seatElement).toHaveClass("cursor-not-allowed");
  });

  it("does not select a seat while another cashier is selecting it", () => {
    const { onSelect, seatElement } = renderSeat({ isSelectingByOther: true });

    fireEvent.click(seatElement);

    expect(onSelect).not.toHaveBeenCalled();
    expect(seatElement).toHaveClass("ring-1");
  });

  it("renders selected seats with the selected state color", () => {
    const { seatElement } = renderSeat({ isSelected: true });

    expect(seatElement).toHaveClass("bg-whis", "text-white");
  });

  it("renders sold and hold states with the correct priority styling", () => {
    const { seatElement } = renderSeat({
      seat: createSeat({ status: 1, isHold: 1 })
    });

    expect(seatElement).toHaveClass("bg-roshi", "text-white");
  });
});
