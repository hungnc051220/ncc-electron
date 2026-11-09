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
    // Tiền vé 0 ₫ và tổng thanh toán 0 ₫; không có dòng giảm giá khi giảm giá = 0.
    expect(screen.getAllByText((content) => content.replace(/\s/g, "") === "0₫")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Kiểm tra lại giao dịch TT" })).toBeInTheDocument();
  });

  it("shows options instead of auto-closing when the QR expires", () => {
    const onCancel = vi.fn();

    render(<QrCodeDialog open onCancel={onCancel} dataQr={baseQrData} />);
    fireEvent.click(screen.getByTestId("countdown-expire"));

    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByText("Hết thời gian chờ thanh toán")).toBeInTheDocument();
    expect(screen.getByText(/kiểm tra lại giao dịch hoặc kết thúc/i)).toBeInTheDocument();
    // Hết giờ: đồng hồ cát đứng yên.
    expect(screen.getByTestId("animated-hourglass")).toHaveAttribute("data-paused", "true");
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

    expect(screen.getByText("Tiền vé")).toBeInTheDocument();
    expect(textOf("qr-ticket-total")).toBe(money(100000));
    expect(screen.getByText("Voucher giấy")).toBeInTheDocument();
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

    expect(screen.getByText("Giảm giá")).toBeInTheDocument();
    expect(screen.getByText("Tổng thanh toán")).toBeInTheDocument();
    // Tiền vé = 120.000 + 20.000 giảm giá; thanh toán = tổng đơn.
    expect(textOf("qr-ticket-total")).toBe(money(140000));
    expect(textOf("qr-discount")).toBe(money(20000));
    expect(textOf("qr-payable-amount")).toBe(money(120000));
    expect(screen.queryByText(/Voucher giấy/)).not.toBeInTheDocument();
  });
});

describe("QrCodeDialog without a QR yet (paper voucher, create-qr failed)", () => {
  const pendingQrData = {
    ...baseQrData,
    qrcode: "",
    paperVoucher: { orderTotal: 100000, voucherApplied: 80000, remainingPayable: 20000 }
  };

  it("shows the reason instead of a QR code and lets the cashier create it again", () => {
    const onRetryCreateQr = vi.fn();

    render(
      <QrCodeDialog
        open
        dataQr={pendingQrData}
        qrUnavailableMessage="Máy chủ tạm thời chưa tạo được QR."
        onRetryCreateQr={onRetryCreateQr}
      />
    );

    expect(screen.getByTestId("qr-unavailable")).toHaveTextContent("Không tạo được mã QR");
    expect(screen.getByTestId("qr-unavailable")).toHaveTextContent(
      "Máy chủ tạm thời chưa tạo được QR."
    );
    fireEvent.click(screen.getByRole("button", { name: "Tạo lại QR" }));
    expect(onRetryCreateQr).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Kết thúc" })).toBeEnabled();
  });

  it("never offers Tạo lại QR once the QR exists", () => {
    render(<QrCodeDialog open dataQr={baseQrData} onRetryCreateQr={vi.fn()} />);

    expect(screen.queryByTestId("qr-unavailable")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tạo lại QR" })).not.toBeInTheDocument();
  });

  it("locks the other actions while one is running", () => {
    const { rerender } = render(
      <QrCodeDialog
        open
        dataQr={pendingQrData}
        qrUnavailableMessage="Chưa có QR"
        onRetryCreateQr={vi.fn()}
        isClosing
      />
    );

    expect(screen.getByRole("button", { name: "Tạo lại QR" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Kiểm tra lại giao dịch TT" })).toBeDisabled();

    rerender(
      <QrCodeDialog
        open
        dataQr={pendingQrData}
        qrUnavailableMessage="Chưa có QR"
        onRetryCreateQr={vi.fn()}
        isRetryingQr
      />
    );

    expect(screen.getByRole("button", { name: "Kết thúc" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Kiểm tra lại giao dịch TT" })).toBeDisabled();
  });

  it("while the QR is being created again: waiting state, no retry button, no error caption", () => {
    render(
      <QrCodeDialog
        open
        dataQr={pendingQrData}
        qrUnavailableMessage="Máy chủ chưa phản hồi."
        onRetryCreateQr={vi.fn()}
        isRetryingQr
      />
    );

    expect(screen.getByTestId("qr-unavailable")).toHaveTextContent("Đang tạo lại QR…");
    expect(screen.queryByText("Không tạo được mã QR")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tạo lại QR" })).not.toBeInTheDocument();
  });

  it("keeps a long backend reason to two lines with the full text on hover", () => {
    const inputReason = "Nhà cung cấp từ chối tạo QR ".repeat(8).trim();

    render(
      <QrCodeDialog
        open
        dataQr={pendingQrData}
        qrUnavailableMessage={inputReason}
        onRetryCreateQr={vi.fn()}
      />
    );

    const actualReason = screen.getByTitle(inputReason);
    expect(actualReason).toHaveClass("line-clamp-2");
  });
});

describe("QrCodeDialog payment details", () => {
  it("lists the ticket price, the discount code, every paper voucher batch and the amount left", () => {
    render(
      <QrCodeDialog
        open
        dataQr={{
          ...baseQrData,
          orderTotal: 180000,
          orderDiscount: 20000,
          voucherCode: "NCC20K",
          transactionAmount: 100000,
          paperVoucher: {
            orderTotal: 180000,
            voucherApplied: 80000,
            remainingPayable: 100000,
            lines: [
              { batchCode: "LÔ-901", quantity: 1 },
              { batchCode: "LÔ-904", quantity: 2 }
            ]
          }
        }}
      />
    );

    expect(screen.getByText("· 2 ghế")).toBeInTheDocument();
    expect(textOf("qr-ticket-total")).toBe(money(200000));
    expect(screen.getByText("Mã giảm giá")).toBeInTheDocument();
    expect(screen.getByText("NCC20K")).toBeInTheDocument();
    expect(textOf("qr-discount")).toBe(money(20000));
    expect(screen.getByText("LÔ-901 ×1")).toBeInTheDocument();
    expect(screen.getByText("LÔ-904 ×2")).toBeInTheDocument();
    expect(textOf("qr-paper-voucher-applied")).toBe(money(80000));
    expect(screen.getByText("Cần thanh toán thêm")).toBeInTheDocument();
    expect(textOf("qr-payable-amount")).toBe(money(100000));
    expect(screen.getByText("Đơn #77")).toBeInTheDocument();
  });

  it("a U22 order shows its U22 price as the ticket price, without a discount line", () => {
    render(
      <QrCodeDialog
        open
        dataQr={{
          ...baseQrData,
          orderTotal: 70000,
          orderDiscount: 10000,
          voucherCode: "U22Ticket"
        }}
      />
    );

    expect(textOf("qr-ticket-total")).toBe(money(70000));
    expect(screen.queryByTestId("qr-discount")).not.toBeInTheDocument();
    expect(textOf("qr-payable-amount")).toBe(money(70000));
  });

  it("the hourglass runs while waiting for the payment", () => {
    render(<QrCodeDialog open dataQr={baseQrData} />);

    expect(screen.getByText("Đang chờ khách thanh toán")).toBeInTheDocument();
    expect(screen.getByTestId("animated-hourglass")).toHaveAttribute("data-paused", "false");
  });
});
