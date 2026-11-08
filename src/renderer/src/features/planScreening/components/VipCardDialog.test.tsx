import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ListSeat } from "@shared/types";
import { formatMoney } from "@renderer/lib/utils";
import { ordersApi } from "@renderer/api/orders.api";
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
/** Backend trả giá U22 của ngày suất chiếu (T3 → 55.000đ theo cấu hình mặc định). */
const U22_APPLIED = { isValid: true, discountAmount: 45000, reason: "applied", u22Price: 55000 };

vi.mock("@renderer/api/orders.api", () => ({
  ordersApi: { validateVoucher: vi.fn() }
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

// Dialog/bảng antd: khi chạy song song toàn bộ test có thể chậm hơn mặc định 5 s (như test voucher giấy).
describe("VipCardDialog exclusive discounts", { timeout: 30000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ordersApi.validateVoucher).mockResolvedValue(U22_APPLIED);
  });

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
      pointReward: undefined,
      expectedU22Price: voucherCode === "U22Ticket" ? 55000 : undefined
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

describe("VipCardDialog U22 price from the backend", { timeout: 30000 }, () => {
  const U22_RADIO = "Áp dụng ưu đãi cho thành viên U22";

  const searchCard = async () => {
    const props = {
      open: true,
      onCancel: vi.fn(),
      onBooking: vi.fn(),
      totalPrice: 100000,
      planScreenId: 1,
      selectedSeats,
      hasSeatTypeDiscount: false,
      filmVersionCode: "2D"
    };
    render(<VipCardDialog {...props} />);
    fireEvent.change(screen.getByPlaceholderText("Nhập số thẻ"), { target: { value: "VIP123" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Tìm kiếm" }));
    });
    await waitFor(() => expect(ordersApi.validateVoucher).toHaveBeenCalled());
    return props;
  };

  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["Thứ 3", 55000, 45000],
    ["Thứ 7", 70000, 30000]
  ])(
    "previews the %s U22 price %i returned by the backend",
    async (_day, u22Price, expectedDiscount) => {
      vi.mocked(ordersApi.validateVoucher).mockResolvedValue({ ...U22_APPLIED, u22Price });
      const props = await searchCard();

      await waitFor(() => expect(screen.getByRole("radio", { name: U22_RADIO })).toBeEnabled());
      fireEvent.click(screen.getByRole("radio", { name: U22_RADIO }));

      expect(screen.getByText(/Giá vé U22 của suất chiếu này/)).toHaveTextContent(
        formatMoney(u22Price).replace(/\s/g, " ")
      );
      expectTotal("Tiền khuyến mãi:", `-${formatMoney(expectedDiscount)}`);
      expectTotal("Thành tiền:", formatMoney(u22Price));
      confirmBooking();
      expect(props.onBooking).toHaveBeenCalledWith(
        expect.objectContaining({ voucherCode: "U22Ticket", expectedU22Price: u22Price })
      );
    }
  );

  it("locks U22 on a holiday and names the holiday", async () => {
    vi.mocked(ordersApi.validateVoucher).mockResolvedValue({
      isValid: false,
      discountAmount: 0,
      reason: "holiday",
      holidayName: "Quốc khánh"
    });
    await searchCard();

    await waitFor(() =>
      expect(
        screen.getByText("Ngày suất chiếu là ngày lễ (Quốc khánh), không áp dụng ưu đãi U22.")
      ).toBeInTheDocument()
    );
    expect(screen.getByRole("radio", { name: U22_RADIO })).toBeDisabled();
  });

  it("locks U22 when the backend returns no u22Price (backend without U22 price config)", async () => {
    vi.mocked(ordersApi.validateVoucher).mockResolvedValue({
      isValid: true,
      discountAmount: 45000,
      reason: "applied"
    });
    await searchCard();

    await waitFor(() =>
      expect(
        screen.getByText("Máy chủ chưa trả giá U22 cho suất chiếu này, chưa thể bán ưu đãi U22.")
      ).toBeInTheDocument()
    );
    expect(screen.getByRole("radio", { name: U22_RADIO })).toBeDisabled();
  });

  it("locks U22 and shows the backend message when validateVoucher fails", async () => {
    vi.mocked(ordersApi.validateVoucher).mockRejectedValue(
      new Error("Chưa đọc được cấu hình giá vé U22. Liên hệ quản trị viên.")
    );
    await searchCard();

    await waitFor(() =>
      expect(
        screen.getByText(/Không áp dụng được ưu đãi U22: Chưa đọc được cấu hình giá vé U22/)
      ).toBeInTheDocument()
    );
    expect(screen.getByRole("radio", { name: U22_RADIO })).toBeDisabled();
  });

  it("does not send expectedU22Price for a campaign voucher", async () => {
    vi.mocked(ordersApi.validateVoucher).mockResolvedValue(U22_APPLIED);
    const props = await searchCard();
    await waitFor(() => expect(screen.getByRole("radio", { name: U22_RADIO })).toBeEnabled());

    confirmBooking();

    expect(props.onBooking).toHaveBeenCalledWith(
      expect.objectContaining({ voucherCode: "PROMO", expectedU22Price: undefined })
    );
  });
});
