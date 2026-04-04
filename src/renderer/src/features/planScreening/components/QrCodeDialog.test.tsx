import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
  referenceLabelCode: "REF",
  accountName: "TRUNG TAM CHIEU PHIM",
  accountNumber: "123456789",
  accountBankName: "VietinBank",
  orderTotal: 120000,
  orderDiscount: 20000,
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
    expect(screen.getByRole("button", { name: "Check lại giao dịch TT" })).toBeInTheDocument();
  });

  it("shows options instead of auto-closing when the QR expires", () => {
    const onCancel = vi.fn();

    render(<QrCodeDialog open onCancel={onCancel} dataQr={baseQrData} />);
    fireEvent.click(screen.getByTestId("countdown-expire"));

    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getAllByText(/kết thúc hoặc check lại giao dịch TT/i).length).toBeGreaterThan(0);
  });

  it("calls onCheckTransaction when clicking the retry button", () => {
    const onCheckTransaction = vi.fn();

    render(<QrCodeDialog open onCheckTransaction={onCheckTransaction} dataQr={baseQrData} />);
    fireEvent.click(screen.getByRole("button", { name: "Check lại giao dịch TT" }));

    expect(onCheckTransaction).toHaveBeenCalledTimes(1);
  });

  it("hides the close button in customer view", () => {
    render(<QrCodeDialog open dataQr={baseQrData} isCustomerView />);

    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Check lại giao dịch TT" })
    ).not.toBeInTheDocument();
  });
});
