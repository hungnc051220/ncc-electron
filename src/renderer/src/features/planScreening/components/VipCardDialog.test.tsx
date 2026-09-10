import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ListSeat } from "@shared/types";
import { formatMoney } from "@renderer/lib/utils";
import VipCardDialog from "./VipCardDialog";

const mocks = vi.hoisted(() => ({
  message: { error: vi.fn(), warning: vi.fn() },
  customer: {
    id: 1,
    fullName: "Khách hàng thử nghiệm",
    currentCardId: 12,
    cardLevel: { currentPointBalance: 10000 }
  },
  vouchers: {
    items: [
      {
        batchId: 1,
        batchName: "Khuyến mãi vé",
        valueType: 1,
        discountValue: 100,
        vouchers: [{ code: "PROMO" }]
      }
    ]
  }
}));

vi.mock("@renderer/hooks/useAntdApp", () => ({
  useAntdApp: () => ({ message: mocks.message })
}));
vi.mock("@renderer/hooks/useCustomer", () => ({
  useCustomer: (code?: string) => ({
    data: code ? mocks.customer : undefined,
    isFetched: Boolean(code),
    isFetching: false,
    isPlaceholderData: false
  })
}));
vi.mock("@renderer/hooks/vouchers/useAvailableVouchersForPos", () => ({
  useAvailableVouchersForPos: () => ({ data: mocks.vouchers, isFetching: false })
}));
vi.mock("@renderer/hooks/vouchers/useConfigExchangePoints", () => ({
  useConfigExchangePoints: () => ({
    data: { data: { basePoint: 1000, baseAmount: 10000, minPointsForRedemption: 1000 } },
    isFetching: false
  })
}));
vi.mock("@renderer/api/orders.api", () => ({
  ordersApi: { validateVoucher: vi.fn().mockResolvedValue({ isValid: true }) }
}));

const selectedSeats: ListSeat[] = [
  {
    seat: "1",
    rows: 1,
    column: 1,
    y: 1,
    code: "A1",
    type: 1,
    status: 0,
    floor: 1,
    price: 100000,
    checkinStatus: 0,
    isInvitation: 0,
    isContract: 0,
    isHold: 0,
    positionName: "Thường"
  }
];

const setup = async (hasSeatTypeDiscount = false) => {
  const props = {
    open: true,
    onCancel: vi.fn(),
    onBooking: vi.fn(),
    totalPrice: 100000,
    planScreenId: 1,
    selectedSeats,
    hasSeatTypeDiscount,
    filmVersionCode: "2D"
  };
  const result = render(<VipCardDialog {...props} />);
  fireEvent.change(screen.getByPlaceholderText("Nhập số thẻ"), { target: { value: "VIP123" } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Tìm kiếm" }));
  });
  if (!hasSeatTypeDiscount) {
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: "Áp dụng ưu đãi cho thành viên U22" })).toBeEnabled()
    );
  }
  return { ...result, props };
};

const redeemPoints = () => {
  fireEvent.click(screen.getByRole("button", { name: "Đổi điểm" }));
  fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "10000" } });
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
};

const confirmBooking = () => {
  fireEvent.click(screen.getByRole("button", { name: "OK" }));
};

const expectTotal = (label: string, amount: string) => {
  expect(screen.getByText(label).parentElement).toHaveTextContent(amount.replace(/\s/g, " "));
};

describe("VipCardDialog exclusive discounts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("replaces even a full voucher discount with points based on the original total", async () => {
    const { props } = await setup();
    expectTotal("Tiền khuyến mãi:", `-${formatMoney(100000)}`);
    redeemPoints();
    expect(screen.getByRole("radio", { name: "Không áp dụng khuyến mãi" })).toBeChecked();
    expectTotal("Tiền khuyến mãi:", `-${formatMoney(0)}`);
    expectTotal("Tiền đổi điểm:", `-${formatMoney(100000)}`);
    expectTotal("Thành tiền:", formatMoney(0));
    confirmBooking();
    expect(props.onBooking).toHaveBeenCalledWith({
      customerId: 1,
      memberCardCode: "VIP123",
      voucherCode: undefined,
      pointReward: 10000
    });
  });

  it.each([
    ["Áp dụng chương trình khuyến mãi", "PROMO"],
    ["Áp dụng ưu đãi cho thành viên U22", "U22Ticket"]
  ])("clears redeemed points when selecting %s", async (label, voucherCode) => {
    const { props } = await setup();
    redeemPoints();
    fireEvent.click(screen.getByRole("radio", { name: label }));
    expectTotal("Tiền đổi điểm:", `-${formatMoney(0)}`);
    confirmBooking();
    expect(props.onBooking).toHaveBeenCalledWith({
      customerId: 1,
      memberCardCode: "VIP123",
      voucherCode,
      pointReward: undefined
    });
  });

  it("keeps the selected campaign when point redemption is cancelled", async () => {
    const { props } = await setup();
    fireEvent.click(screen.getByRole("button", { name: "Đổi điểm" }));
    fireEvent.click(screen.getByRole("button", { name: "Không đổi điểm" }));
    confirmBooking();
    expect(props.onBooking).toHaveBeenCalledWith(
      expect.objectContaining({ voucherCode: "PROMO", pointReward: undefined })
    );
  });

  it("clears old redeemed points when the dialog is reopened", async () => {
    const { props, rerender } = await setup();
    redeemPoints();
    rerender(<VipCardDialog {...props} open={false} />);
    rerender(<VipCardDialog {...props} />);
    expectTotal("Tiền đổi điểm:", `-${formatMoney(0)}`);
    confirmBooking();
    expect(props.onBooking).toHaveBeenCalledWith(
      expect.objectContaining({ voucherCode: "PROMO", pointReward: undefined })
    );
  });

  it("allows neither discount when seat type discounts already apply", async () => {
    const { props } = await setup(true);
    expect(screen.getByRole("button", { name: "Đổi điểm" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Áp dụng chương trình khuyến mãi" })).toBeDisabled();
    confirmBooking();
    expect(props.onBooking).toHaveBeenCalledWith(
      expect.objectContaining({ voucherCode: undefined, pointReward: undefined })
    );
  });
});
