import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { formatMoney } from "@renderer/lib/utils";
import { OrderStatus, PaymentStatus, PaymentType } from "@shared/types";
import QrCodeDialog from "./QrCodeDialog";

vi.mock("./Countdown", () => ({
  default: ({
    setExpired
  }: {
    orderCreatedAt: string;
    expired: boolean;
    setExpired: (value: boolean) => void;
  }) => {
    return (
      <button data-testid="countdown-expire" onClick={() => setExpired(true)}>
        countdown
      </button>
    );
  }
}));

const baseQrData = {
  orderId: 77,
  qrcode: "vietqr://payload",
  paymentMethodSystemName: PaymentType.VIETQR,
  referenceLabelCode: "REF",
  accountName: "TRUNG TAM CHIEU PHIM",
  accountNumber: "123456789",
  accountBankName: "VietinBank",
  orderTotal: 120000,
  orderDiscount: 20000,
  orderStatusId: OrderStatus.PENDING,
  shippingStatusId: 0,
  paymentStatusId: PaymentStatus.PENDING,
  createdOnUtc: "2026-03-13T10:00:00.000Z",
  filmName: "Conan",
  roomName: "Phong 1",
  projectDate: "2026-03-13",
  projectTime: "2026-03-13T12:30:00.000Z",
  seats: "A1, A2"
};

describe("QrCodeDialog", () => {
  it("renders ticket information and payment totals safely", () => {
    render(
      <QrCodeDialog
        open
        dataQr={{
          ...baseQrData,
          orderTotal: undefined as unknown as number,
          orderDiscount: undefined as unknown as number
        }}
      />
    );

    expect(screen.getByText("Thanh toán QR Code")).toBeInTheDocument();
    expect(screen.getByText("Conan")).toBeInTheDocument();
    expect(screen.getByText("A1, A2")).toBeInTheDocument();
    expect(screen.getAllByText((content) => content.replace(/\s/g, "") === "0₫")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Kiểm tra lại giao dịch TT" })).toBeInTheDocument();
  });

  it("shows options instead of auto-closing when the QR expires", () => {
    const onCancel = vi.fn();

    render(<QrCodeDialog open onCancel={onCancel} dataQr={baseQrData} />);
    fireEvent.click(screen.getByTestId("countdown-expire"));

    expect(onCancel).not.toHaveBeenCalled();
    expect(
      screen.getAllByText(/kết thúc hoặc check lại giao dịch thanh toán/i).length
    ).toBeGreaterThan(0);
  });

  it("calls onCheckTransaction when clicking the retry button", () => {
    const onCheckTransaction = vi.fn();

    render(<QrCodeDialog open onCheckTransaction={onCheckTransaction} dataQr={baseQrData} />);
    fireEvent.click(screen.getByRole("button", { name: "Kiểm tra lại giao dịch TT" }));

    expect(onCheckTransaction).toHaveBeenCalledTimes(1);
  });

  it("hides the close button in customer view", () => {
    render(<QrCodeDialog open dataQr={baseQrData} isCustomerView />);

    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Kiểm tra lại giao dịch TT" })
    ).not.toBeInTheDocument();
  });

  it("shows VietQR brand image when QR payload is VietQR", () => {
    render(<QrCodeDialog open dataQr={baseQrData} />);

    expect(screen.getByRole("img", { name: "VietQR" })).toBeInTheDocument();
  });

  it("shows VNPayQR brand image when QR payload is VNPay", () => {
    render(
      <QrCodeDialog
        open
        dataQr={{
          ...baseQrData,
          qrcode: "vnpay://payload",
          paymentMethodSystemName: PaymentType.VNPAY
        }}
      />
    );

    expect(screen.getByRole("img", { name: "VNPayQR" })).toBeInTheDocument();
  });
});

const textOf = (testId: string) => screen.getByTestId(testId).textContent?.replace(/\s/g, "");
const money = (amount: number) => formatMoney(amount).replace(/\s/g, "");

describe("QrCodeDialog with a paper voucher", () => {
  const voucherQrData = {
    ...baseQrData,
    orderTotal: 100000,
    orderDiscount: 0,
    transactionAmount: 20000,
    paperVoucher: { orderTotal: 100000, voucherApplied: 80000, remainingPayable: 20000 }
  };

  it("shows the ticket total, the voucher payment and the QR amount from create-qr", () => {
    render(<QrCodeDialog open dataQr={voucherQrData} />);

    expect(screen.getByText("Tổng tiền vé:")).toBeInTheDocument();
    expect(textOf("qr-ticket-total")).toBe(money(100000));
    expect(screen.getByText("Thanh toán bằng Voucher giấy:")).toBeInTheDocument();
    expect(textOf("qr-paper-voucher-applied")).toBe(money(80000));
    expect(screen.getByText("Cần thanh toán thêm")).toBeInTheDocument();
    expect(textOf("qr-payable-amount")).toBe(money(20000));
    expect(screen.queryByText("Tổng thanh toán")).not.toBeInTheDocument();
  });

  it("uses the transaction amount of create-qr even if it differs from the order remaining", () => {
    render(<QrCodeDialog open dataQr={{ ...voucherQrData, transactionAmount: 25000 }} />);

    expect(textOf("qr-payable-amount")).toBe(money(25000));
  });

  it("falls back to the remaining payable when create-qr has no transaction amount", () => {
    render(<QrCodeDialog open dataQr={{ ...voucherQrData, transactionAmount: undefined }} />);

    expect(textOf("qr-payable-amount")).toBe(money(20000));
  });

  it("keeps the discount display of an order without paper voucher", () => {
    render(<QrCodeDialog open dataQr={baseQrData} />);

    expect(screen.getByText("Giảm giá:")).toBeInTheDocument();
    expect(screen.getByText("Tổng thanh toán")).toBeInTheDocument();
    // Tổng tiền vé = 120.000 + 20.000 giảm giá; thanh toán = tổng đơn.
    expect(
      screen.getByText((content) => content.replace(/\s/g, "") === money(140000))
    ).toBeInTheDocument();
    expect(textOf("qr-payable-amount")).toBe(money(120000));
    expect(screen.queryByText(/Voucher giấy/)).not.toBeInTheDocument();
  });
});
