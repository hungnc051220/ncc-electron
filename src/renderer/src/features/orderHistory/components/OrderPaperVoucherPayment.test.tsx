import { formatMoney } from "@renderer/lib/utils";
import type { OrderPaperVoucherDetail } from "@shared/types";
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { OrderPaperVoucherLines, OrderPaperVoucherPaymentRows } from "./OrderPaperVoucherPayment";
import { buildPaperVoucherPaymentRows } from "./OrderPaperVoucherPayment.utils";

/** Giống đơn DEV 10206513: 2 lô, voucher trả đủ, thừa 10.000. */
const buildPaperVoucher = (
  overrides: Partial<OrderPaperVoucherDetail> = {}
): OrderPaperVoucherDetail => ({
  redemptionId: 19,
  requestId: "6f1c2a4e-8a1b-4b7c-9d3e-2f6a1b0c9d8e",
  status: "applied",
  paymentMethodSystemName: "POS",
  orderTotal: 285000,
  voucherQuantity: 3,
  faceValueTotal: 295000,
  voucherApplied: 285000,
  remainingPayable: 0,
  excessAmount: 10000,
  collectedAmount: 0,
  appliedAt: "2026-11-03T10:00:00.000Z",
  reversedAt: null,
  reversedBy: null,
  reversalSource: null,
  reversalReason: null,
  lines: [
    {
      batchId: 1,
      batchCode: "LÔ-001",
      batchName: "Voucher 95k",
      quantity: 1,
      faceValue: 95000,
      faceValueTotal: 95000,
      appliedAmount: 85000,
      excessAmount: 10000,
      status: "applied"
    },
    {
      batchId: 3,
      batchCode: "LÔ-002",
      batchName: "Voucher 100k",
      quantity: 2,
      faceValue: 100000,
      faceValueTotal: 200000,
      appliedAmount: 200000,
      excessAmount: 0,
      status: "applied"
    }
  ],
  ...overrides
});

/** toHaveTextContent chuẩn hoá khoảng trắng (kể cả NBSP của Intl) ở phía nội dung thực tế. */
const asText = (value: string) => value.replace(/\s+/g, " ");

const renderRow = (label: string, value: ReactNode) => (
  <div data-testid="payment-row">
    <span>{label}</span>
    {value}
  </div>
);

describe("buildPaperVoucherPaymentRows", () => {
  it("tách giá vé trước voucher, voucher đã áp dụng và tiền khách trả thêm bằng tiền mặt", () => {
    const actualRows = buildPaperVoucherPaymentRows(
      buildPaperVoucher({
        orderTotal: 190000,
        voucherQuantity: 1,
        faceValueTotal: 95000,
        voucherApplied: 95000,
        remainingPayable: 95000,
        excessAmount: 0,
        collectedAmount: 95000
      })
    );

    expect(actualRows.map(({ label, value }) => [label, value])).toEqual([
      ["Giá vé trước voucher", formatMoney(190000)],
      ["Voucher giấy đã áp dụng", `-${formatMoney(95000)}`],
      ["Tiền khách thực trả", formatMoney(95000)]
    ]);
  });

  it("thêm tiền thừa voucher khi mệnh giá vượt giá trị đơn, chỉ hiển thị số tiền", () => {
    const actualRows = buildPaperVoucherPaymentRows(buildPaperVoucher());

    expect(actualRows.find((row) => row.key === "paidByCustomer")?.value).toBe(formatMoney(0));
    expect(actualRows.find((row) => row.key === "excess")?.value).toBe(formatMoney(10000));
  });

  it("hiển thị 0 khi đơn QR còn chờ thanh toán hoặc voucher đã trả lại lô", () => {
    const pendingQr = buildPaperVoucher({
      status: "held",
      paymentMethodSystemName: "Payments.VietQR",
      voucherApplied: 80000,
      remainingPayable: 20000,
      excessAmount: 0,
      collectedAmount: null
    });

    expect(buildPaperVoucherPaymentRows(pendingQr)[2].value).toBe(formatMoney(0));
    expect(buildPaperVoucherPaymentRows({ ...pendingQr, status: "released" })[2].value).toBe(
      formatMoney(0)
    );
  });
});

describe("OrderPaperVoucherPaymentRows", () => {
  it("hiển thị các dòng thanh toán voucher bằng renderer dòng của dialog", () => {
    render(
      <OrderPaperVoucherPaymentRows paperVoucher={buildPaperVoucher()} renderRow={renderRow} />
    );

    const rows = screen.getAllByTestId("payment-row");
    expect(rows).toHaveLength(4);
    expect(screen.getByTestId("paper-voucher-orderTotal")).toHaveTextContent(
      asText(formatMoney(285000))
    );
    expect(screen.getByTestId("paper-voucher-voucherApplied")).toHaveTextContent(
      asText(`-${formatMoney(285000)}`)
    );
    expect(screen.getByTestId("paper-voucher-excess")).toHaveTextContent(
      asText(formatMoney(10000))
    );
  });
});

describe("OrderPaperVoucherLines", () => {
  it("liệt kê từng lô, số tờ, tiền áp dụng và trạng thái voucher", () => {
    render(<OrderPaperVoucherLines paperVoucher={buildPaperVoucher()} />);

    const section = screen.getByTestId("order-paper-voucher-lines");
    expect(within(section).getByTestId("paper-voucher-status")).toHaveTextContent("Đã sử dụng");
    expect(section).toHaveTextContent(asText(`3 tờ · Tổng mệnh giá ${formatMoney(295000)}`));
    const firstRow = within(section).getByText("LÔ-001").closest("tr") as HTMLElement;
    expect(firstRow).toHaveTextContent("Voucher 95k");
    expect(firstRow).toHaveTextContent(asText(formatMoney(85000)));
    expect(firstRow).toHaveTextContent(asText(formatMoney(10000)));
    expect(firstRow).toHaveTextContent("Đã áp dụng");
    expect(within(section).getByText("LÔ-002")).toBeInTheDocument();
    expect(screen.queryByTestId("paper-voucher-reversal")).not.toBeInTheDocument();
  });

  it("hiển thị voucher đã hủy theo đơn và người hủy", () => {
    render(
      <OrderPaperVoucherLines
        paperVoucher={buildPaperVoucher({
          status: "cancelled",
          reversedAt: "2026-11-03T11:00:00.000Z",
          reversedBy: "thungan01",
          lines: buildPaperVoucher().lines.map((line) => ({ ...line, status: "cancelled" }))
        })}
      />
    );

    expect(screen.getByTestId("paper-voucher-status")).toHaveTextContent("Đã hủy theo đơn");
    expect(screen.getAllByText("Đã hủy, không dùng lại")).toHaveLength(2);
    expect(screen.getByTestId("paper-voucher-reversal")).toHaveTextContent("bởi thungan01");
  });
});
