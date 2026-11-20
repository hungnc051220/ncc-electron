import type { ListSeat } from "@shared/types";
import { fireEvent, render } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import Seat from "./Seat";

const ICON = "https://res.anvui.vn/demo/image/upload/v1/attachments_ncc/admin/seat-icons/sold.png";
const OTHER_ICON =
  "https://res.anvui.vn/demo/image/upload/v2/attachments_ncc/admin/seat-icons/new.png";

const SEAT_TYPES = {
  normal: { type: 0, positionId: 1, color: "#8f8f8f" },
  vip: { type: 1, positionId: 2, color: "#f5c542" },
  couple: { type: 2, positionId: 3, color: "#ff7aa2" }
} as const;

const createSeat = (overrides: Partial<ListSeat> = {}): ListSeat => ({
  seat: "5",
  rows: 1,
  column: 5,
  y: 1,
  code: "D5",
  type: 0,
  status: 1,
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

type SeatProps = ComponentProps<typeof Seat>;

const baseProps = (overrides: Partial<SeatProps> = {}): SeatProps => ({
  seat: createSeat(),
  isSelected: false,
  onSelect: vi.fn(),
  size: 40,
  canSelect: false,
  seatColor: SEAT_TYPES.normal.color,
  seatUniqueKey: "1-5",
  soldIconUrl: ICON,
  ...overrides
});

const renderSeat = (overrides: Partial<SeatProps> = {}) => {
  const props = baseProps(overrides);
  const view = render(<Seat {...props} />);
  const cell = () => view.container.querySelector<HTMLDivElement>("[data-seat-code]")!;
  const icon = () => cell().querySelector("img");
  const visibleCode = () => cell().querySelector("p");
  return { ...view, props, cell, icon, visibleCode };
};

describe("Seat sold icon", () => {
  it.each(Object.entries(SEAT_TYPES))(
    "covers a sold %s seat with the image, hides the code and keeps the seat-type border",
    (_, seatType) => {
      const { cell, icon, visibleCode } = renderSeat({
        seat: createSeat({ type: seatType.type, positionId: seatType.positionId }),
        seatColor: seatType.color
      });

      expect(icon()).toHaveAttribute("src", ICON);
      expect(icon()).toHaveClass("absolute", "inset-0", "size-full", "object-cover");
      expect(icon()).toHaveAttribute("aria-hidden", "true");
      expect(visibleCode()).toBeNull();
      // Mã ghế vẫn có cho trình đọc màn hình.
      expect(cell().querySelector(".sr-only")).toHaveTextContent("D5");
      // Viền loại ghế 3px giữ nguyên quanh ảnh, nền "đã bán" giữ nguyên phía sau ảnh trong suốt.
      expect(cell().style.borderWidth).toBe("3px");
      expect(cell().style.borderStyle).toBe("solid");
      expect(cell().style.borderColor).not.toBe("");
      expect(cell()).toHaveClass("bg-trunks", "overflow-hidden");
    }
  );

  it("does not change size or data attributes", () => {
    const { cell } = renderSeat();

    expect(cell().style.width).toBe("40px");
    expect(cell().style.height).toBe("40px");
    expect(cell()).toHaveAttribute("data-seat-code", "D5");
    expect(cell()).toHaveAttribute("data-seat-floor", "1");
    expect(cell()).toHaveAttribute("data-seat-unique-key", "1-5");
    expect(cell()).toHaveAttribute("data-seat-selection-state", "idle");
  });

  it.each<[string, Partial<SeatProps>]>([
    ["an empty seat", { seat: createSeat({ status: 0 }), canSelect: true }],
    ["a hold seat", { seat: createSeat({ isHold: 1 }) }],
    ["a pending payment seat", { isPendingPayment: true }],
    ["a contract seat", { seat: createSeat({ isContract: 1 }) }],
    ["an invitation seat", { seat: createSeat({ isInvitation: 1 }) }],
    ["a non-seat position", { seat: createSeat({ type: 12, code: "" }) }],
    ["a selected seat", { isSelected: true }],
    ["a seat of the order picked for cancellation", { isSelected: true, isCancelRelated: true }],
    ["the clicked cancel seat", { isSelected: true, isCancelRelated: true, isCancelPrimary: true }],
    ["a sold seat without icon", { soldIconUrl: null }]
  ])("keeps the current UI for %s", (_, overrides) => {
    const withIcon = renderSeat(overrides);
    const className = withIcon.cell().className;
    const style = withIcon.cell().getAttribute("style");
    const text = withIcon.cell().textContent;
    expect(withIcon.icon()).toBeNull();
    withIcon.unmount();

    // Giống hệt khi không có cấu hình icon.
    const withoutIcon = renderSeat({ ...overrides, soldIconUrl: undefined });
    expect(withoutIcon.cell().className).toBe(className);
    expect(withoutIcon.cell().getAttribute("style")).toBe(style);
    expect(withoutIcon.cell().textContent).toBe(text);
  });

  it("keeps the cancel highlight and selection behaviour of a sold seat in cancel mode", () => {
    const onSelect = vi.fn();
    const { cell, icon } = renderSeat({
      onSelect,
      canSelect: true,
      isSelected: true,
      isCancelRelated: true,
      isCancelPrimary: true
    });

    expect(icon()).toBeNull();
    expect(cell()).toHaveClass("bg-red-600");
    fireEvent.click(cell());
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("falls back to color + code when the image fails, and retries a new URL", () => {
    const { cell, icon, visibleCode, rerender, props } = renderSeat();

    fireEvent.error(icon()!);
    expect(icon()).toBeNull();
    expect(visibleCode()).toHaveTextContent("D5");
    expect(cell()).toHaveClass("bg-trunks");

    rerender(<Seat {...props} soldIconUrl={OTHER_ICON} />);
    expect(icon()).toHaveAttribute("src", OTHER_ICON);
  });

  it("re-renders through React.memo when the icon URL changes or is removed", () => {
    const { icon, visibleCode, rerender, props } = renderSeat();

    rerender(<Seat {...props} soldIconUrl={OTHER_ICON} />);
    expect(icon()).toHaveAttribute("src", OTHER_ICON);

    rerender(<Seat {...props} soldIconUrl={null} />);
    expect(icon()).toBeNull();
    expect(visibleCode()).toHaveTextContent("D5");
  });
});
