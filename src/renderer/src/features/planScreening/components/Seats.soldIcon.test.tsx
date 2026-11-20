import { resetSeatIconImageCache } from "@renderer/hooks/seatIconConfigs/useSeatIconImage";
import type { ListSeat, PlanScreeningDetailProps } from "@shared/types";
import { render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { MemoryRouter } from "react-router";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import Seats from "./Seats";

vi.mock("@renderer/hooks/seatTypes/useSeatTypes", () => ({
  useSeatTypes: () => ({ data: { data: [] } })
}));
vi.mock("react-selecto", () => ({ default: () => null }));
vi.mock("./TooltipFloating", () => ({ default: () => null }));

const ICON = "https://res.anvui.vn/demo/image/upload/v1/attachments_ncc/admin/seat-icons/sold.png";
const BROKEN_ICON =
  "https://res.anvui.vn/demo/image/upload/v1/attachments_ncc/admin/seat-icons/broken.png";

/** `new Image()` giả: ghi nhận URL được nạp, URL chứa "broken" thì lỗi. */
const requestedImages: string[] = [];
class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(value: string) {
    requestedImages.push(value);
    setTimeout(() => (value.includes("broken") ? this.onerror?.() : this.onload?.()), 0);
  }
}

const originalImage = globalThis.Image;

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    }
  );
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal("Image", FakeImage);
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get: () => 600
  });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get: () => 400
  });
});

afterAll(() => {
  vi.stubGlobal("Image", originalImage);
});

beforeEach(() => {
  requestedImages.length = 0;
  resetSeatIconImageCache();
});

const seat = (code: string, column: number, overrides: Partial<ListSeat> = {}): ListSeat => ({
  seat: String(column),
  rows: 1,
  column,
  y: 1,
  code,
  type: 0,
  status: 0,
  floor: 1,
  price: 100000,
  checkinStatus: 0,
  isInvitation: 0,
  isContract: 0,
  isHold: 0,
  positionId: 1,
  positionName: "Ghế thường",
  ...overrides
});

const SEATS: ListSeat[] = [
  seat("A1", 1, { status: 1 }),
  seat("A2", 2, { status: 1, type: 1, positionId: 2 }),
  seat("A3", 3, { status: 1, type: 2, positionId: 3 }),
  seat("A4", 4),
  seat("A5", 5, { status: 1, isHold: 1 }),
  seat("A6", 6, { status: 1, isContract: 1 }),
  seat("A7", 7, { status: 1, isInvitation: 1 })
];

const data = {
  id: 1,
  filmId: 10,
  roomId: 20,
  projectDate: "2026-11-20",
  projectTime: "2026-11-20T10:00:00.000Z",
  noOnlineChairF1: "",
  noOnlineChairF2: "",
  noOnlineChairF3: "",
  roomInfo: { id: 20, name: "1" },
  filmInfo: { id: 10, filmName: "Phim" },
  listSeats: [SEATS]
} as unknown as PlanScreeningDetailProps;

const renderSeats = (props: Partial<ComponentProps<typeof Seats>> = {}) => {
  const allProps: ComponentProps<typeof Seats> = {
    data,
    orders: [],
    currentPlanScreeningId: 1,
    seatTypes: [],
    selectedSeats: [],
    setSelectedSeats: vi.fn(),
    soldIconUrl: ICON,
    ...props
  };
  const view = render(
    <MemoryRouter>
      <Seats {...allProps} />
    </MemoryRouter>
  );
  return {
    ...view,
    rerenderSeats: (next: Partial<ComponentProps<typeof Seats>>) =>
      view.rerender(
        <MemoryRouter>
          <Seats {...allProps} {...next} />
        </MemoryRouter>
      )
  };
};

const cell = (code: string) =>
  document.querySelector<HTMLDivElement>(`[data-seat-code='${code}']`)!;
const seatIcon = (code: string) => cell(code).querySelector("img");

describe("Seats with the effective sold icon", () => {
  it("shows the icon on sold normal/VIP/couple seats only, after one image load", async () => {
    renderSeats();

    await waitFor(() => expect(seatIcon("A1")).not.toBeNull());
    expect(seatIcon("A2")).toHaveAttribute("src", ICON);
    expect(seatIcon("A3")).toHaveAttribute("src", ICON);
    ["A4", "A5", "A6", "A7"].forEach((code) => {
      expect(seatIcon(code)).toBeNull();
      expect(cell(code)).toHaveTextContent(code);
    });
    // Một lần nạp ảnh cho cả sơ đồ, không theo từng ghế.
    expect(requestedImages).toEqual([ICON]);
    // Chú thích "Ghế đã bán" dùng ảnh.
    expect(screen.getByText("Ghế đã bán").previousElementSibling?.tagName).toBe("IMG");
  });

  it("does not show icons before the image has loaded (no empty cells)", () => {
    renderSeats();

    expect(seatIcon("A1")).toBeNull();
    expect(cell("A1")).toHaveTextContent("A1");
  });

  it("keeps the default UI in cancel mode", async () => {
    renderSeats({ cancelMode: true });

    await waitFor(() => expect(requestedImages).toEqual([ICON]));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(seatIcon("A1")).toBeNull();
    expect(cell("A1")).toHaveTextContent("A1");
  });

  it("falls back to color + code on every seat when the image cannot load", async () => {
    renderSeats({ soldIconUrl: BROKEN_ICON });

    await waitFor(() => expect(requestedImages).toEqual([BROKEN_ICON]));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(document.querySelectorAll("[data-seat-code] img")).toHaveLength(0);
    expect(cell("A1")).toHaveTextContent("A1");
  });

  it("removes icons immediately when the next screening has no icon", async () => {
    const { rerenderSeats } = renderSeats();
    await waitFor(() => expect(seatIcon("A1")).not.toBeNull());

    rerenderSeats({ soldIconUrl: null });

    expect(document.querySelectorAll("[data-seat-code] img")).toHaveLength(0);
  });
});
