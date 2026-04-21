import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ListSeat, OrderStatus, PaymentStatus, PlanScreeningDetailProps } from "@shared/types";
import Seats from "./Seats";

vi.mock("@renderer/hooks/seatTypes/useSeatTypes", () => ({
  useSeatTypes: () => ({
    data: {
      data: []
    }
  })
}));

vi.mock("react-selecto", () => ({
  default: () => null
}));

vi.mock("./TooltipFloating", () => ({
  default: () => null
}));

vi.mock("@renderer/components/Legend", () => ({
  default: () => <div>legend</div>
}));

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    disconnect() {}
    unobserve() {}
  }

  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());

  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get() {
      return 600;
    }
  });

  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get() {
      return 400;
    }
  });
});

const createSeat = (overrides: Partial<ListSeat> = {}): ListSeat => ({
  seat: "1",
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

const createPlanScreening = (seat: ListSeat): PlanScreeningDetailProps => ({
  id: 1,
  planCinemaId: 1,
  projectDate: "2026-03-16",
  projectTime: "2026-03-16T10:00:00.000Z",
  filmId: 1,
  roomId: 1,
  daypartId: 1,
  deleted: false,
  noOnlineChairF1: "",
  noOnlineChairF2: "",
  noOnlineChairF3: "",
  isSelling: 1,
  isOnlineSelling: 1,
  priceOfPosition1: "100000",
  priceOfPosition2: "120000",
  priceOfPosition3: "150000",
  priceOfPosition4: "0",
  createdOnUtc: "2026-03-16T00:00:00.000Z",
  createdUser: "tester",
  updatedOnUtc: "2026-03-16T00:00:00.000Z",
  updatedUser: "tester",
  roomInfo: {
    id: 1,
    name: "Phong 1",
    wideSizeF1: 2,
    deepSizeF1: 2,
    wideSizeF2: 0,
    deepSizeF2: 0,
    wideSizeF3: 0,
    deepSizeF3: 0,
    ruleOrder: "",
    noBreak: false,
    numberOfFloor: 1,
    pictureId: 1,
    deleted: false,
    subjectToAcl: false,
    limitedToStores: false,
    orderNo: 1,
    floor: "1"
  },
  filmInfo: {
    id: 1,
    filmNameEn: "Movie",
    filmName: "Movie",
    countryId: 1,
    duration: 120,
    director: "",
    actors: "",
    introduction: "",
    manufacturerId: 1,
    versionCode: "2D",
    statusCode: "SHOWING",
    languageCode: "vi",
    holding: "",
    description: "",
    sellOnline: true,
    metaDescription: "",
    metaKeyword: "",
    metaTitle: "",
    limitedToStores: false,
    subjectToAcl: false,
    createdOnUtc: "2026-03-16T00:00:00.000Z",
    updatedOnUtc: "2026-03-16T00:00:00.000Z",
    published: true,
    deleted: false,
    pictureId: 1,
    imageUrl: "",
    premieredDay: "2026-03-01",
    videoUrl: "",
    showOnHomePage: false,
    tags: "",
    allowCustomerReviews: false,
    approvedRatingSum: 0,
    notApprovedRatingSum: 0,
    approvedTotalReviews: 0,
    notApprovedTotalReviews: 0,
    totalLike: 0,
    numberOfViews: 0,
    isHot: 0,
    ageAbove: 13,
    proposedPrice: 0,
    trailerOnHomePage: false,
    orderNo: 1,
    sellOnlineBefore: 0,
    createdUser: "tester",
    updatedUser: "tester"
  },
  orders: [],
  listSeats: [[seat]]
});

describe("Seats", () => {
  it("does not allow sold seats to be selected in normal mode", () => {
    const setSelectedSeats = vi.fn();
    const soldSeat = createSeat({ status: 1 });

    render(
      <MemoryRouter>
        <Seats
          data={createPlanScreening(soldSeat)}
          orders={[]}
          selectedSeats={[]}
          setSelectedSeats={setSelectedSeats}
        />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("A1"));

    expect(setSelectedSeats).toHaveBeenCalledWith([]);
    expect(screen.getByText("A1").closest("div")).toHaveClass("cursor-not-allowed");
  });

  it("does not flash sold color when the latest order for a seat is failed", () => {
    const failedSeat = createSeat({ status: 1, positionId: undefined });
    const setSelectedSeats = vi.fn();

    render(
      <MemoryRouter>
        <Seats
          data={createPlanScreening(failedSeat)}
          orders={[
            {
              id: 100,
              createdOnUtc: "2026-03-16T10:05:00.000Z",
              orderStatusId: OrderStatus.FAIL,
              paymentStatusId: PaymentStatus.PENDING,
              items: [
                {
                  planScreenId: 1,
                  listChairIndexF1: "1",
                  listChairIndexF2: "",
                  listChairIndexF3: "",
                  listChairValueF1: "A1",
                  listChairValueF2: "",
                  listChairValueF3: ""
                }
              ]
            }
          ] as any}
          selectedSeats={[]}
          setSelectedSeats={setSelectedSeats}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("A1").closest("[data-seat-code='A1']")).not.toHaveClass("bg-trunks");
  });
});
