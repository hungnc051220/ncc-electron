import { render } from "@testing-library/react";
import { memo } from "react";
import { MemoryRouter } from "react-router";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ListSeat, PlanScreeningDetailProps } from "@shared/types";
import Seats from "./Seats";

const metrics = vi.hoisted(() => ({
  seatRenderCounts: new Map<string, number>()
}));

vi.mock("@renderer/hooks/seatTypes/useSeatTypes", () => ({
  useSeatTypes: () => ({ data: { data: [] } })
}));

vi.mock("react-selecto", () => ({ default: () => null }));
vi.mock("./TooltipFloating", () => ({ default: () => null }));
vi.mock("@renderer/components/Legend", () => ({ default: () => null }));
vi.mock("./Seat", () => {
  const MockSeat = ({
    seat,
    isSelected,
    isSelectionPending,
    isSelectionConflicted,
    isSelectingByOther,
    onSelect
  }: {
    seat: ListSeat;
    isSelected: boolean;
    isSelectionPending?: boolean;
    isSelectionConflicted?: boolean;
    isSelectingByOther?: boolean;
    onSelect: (seat: ListSeat) => void;
  }) => {
    metrics.seatRenderCounts.set(seat.code, (metrics.seatRenderCounts.get(seat.code) || 0) + 1);

    return (
      <button
        data-selected={isSelected}
        data-pending={isSelectionPending}
        data-conflicted={isSelectionConflicted}
        data-selecting-by-other={isSelectingByOther}
        onClick={() => onSelect(seat)}
      >
        {seat.code}
      </button>
    );
  };
  MockSeat.displayName = "MockSeat";

  return { default: memo(MockSeat) };
});

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    disconnect() {}
  }

  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    return window.setTimeout(() => callback(performance.now()), 0);
  });
  vi.stubGlobal("cancelAnimationFrame", (frameId: number) => window.clearTimeout(frameId));

  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get: () => 1200
  });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get: () => 800
  });
});

const createSeat = (index: number): ListSeat => ({
  seat: String(index + 1),
  rows: Math.floor(index / 10) + 1,
  column: (index % 10) + 1,
  y: Math.floor(index / 10) + 1,
  code: `S${index + 1}`,
  type: 0,
  status: 0,
  floor: 1,
  price: 100000,
  checkinStatus: 0,
  isInvitation: 0,
  isContract: 0,
  isHold: 0,
  positionId: 1,
  positionName: "Thường"
});

const seats = Array.from({ length: 100 }, (_, index) => createSeat(index));
const listSeats = Array.from({ length: 10 }, (_, row) => seats.slice(row * 10, row * 10 + 10));
const planScreening = {
  id: 1,
  projectTime: "2026-08-15T07:00:00.000Z",
  projectDate: "2026-08-15",
  filmInfo: { filmName: "Performance test" },
  roomInfo: { name: "Phòng test" },
  listSeats
} as PlanScreeningDetailProps;
const orders = [];
const selectedSeats = [seats[0]];
const setSelectedSeats = vi.fn();

const getTotalSeatRenders = () =>
  Array.from(metrics.seatRenderCounts.values()).reduce((total, count) => total + count, 0);

describe("Seats render isolation", () => {
  beforeEach(() => {
    metrics.seatRenderCounts.clear();
    setSelectedSeats.mockReset();
  });

  it("rerenders only the affected seat when one socket conflict arrives", () => {
    const { rerender } = render(
      <MemoryRouter>
        <Seats
          data={planScreening}
          orders={orders}
          selectedSeats={selectedSeats}
          pendingSelectedSeatKeys={["1-1"]}
          setSelectedSeats={setSelectedSeats}
        />
      </MemoryRouter>
    );

    expect(getTotalSeatRenders()).toBe(100);

    rerender(
      <MemoryRouter>
        <Seats
          data={planScreening}
          orders={orders}
          selectedSeats={selectedSeats}
          selectingSeatsByOther={{ "1-1": "POS-B" }}
          conflictedSelectedSeatKeys={["1-1"]}
          setSelectedSeats={setSelectedSeats}
        />
      </MemoryRouter>
    );

    expect(metrics.seatRenderCounts.get("S1")).toBe(2);
    expect(metrics.seatRenderCounts.get("S2")).toBe(1);
    expect(getTotalSeatRenders()).toBe(101);
  });
});
