import { server } from "@renderer/test/msw/server";
import type { PaperVoucherBatch } from "@shared/types";
import { http, HttpResponse } from "msw";
import {
  getButtonByText,
  PAPER_VOUCHER_FIXTURES,
  PAPER_VOUCHER_TEST_BASE,
  PaperVoucherTestProviders,
  setupPaperVoucherServer,
  stubObjectUrls
} from "@renderer/features/vouchers/paperVouchers/paperVoucher.testUtils";
import type { PaperVoucherSelectionLine } from "@renderer/features/vouchers/paperVouchers/paperVoucherRedemption";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PaperVoucherDialog from "./PaperVoucherDialog";

vi.mock("@renderer/features/vouchers/paperVouchers/paperVoucher.utils", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@renderer/features/vouchers/paperVouchers/paperVoucher.utils")
  >()),
  getVietnamBusinessDate: () => "2026-10-30"
}));

const renderDialog = ({
  value = [],
  ticketCount = 2,
  ticketAmount = 180000,
  discountAmount = 0
}: {
  value?: PaperVoucherSelectionLine[];
  ticketCount?: number;
  ticketAmount?: number;
  discountAmount?: number;
} = {}) => {
  const onApply = vi.fn();
  const onCancel = vi.fn();

  render(
    <PaperVoucherTestProviders>
      <PaperVoucherDialog
        open
        value={value}
        ticketCount={ticketCount}
        ticketAmount={ticketAmount}
        discountAmount={discountAmount}
        onApply={onApply}
        onCancel={onCancel}
      />
    </PaperVoucherTestProviders>
  );

  const dialog = screen.getByText("Áp dụng voucher giấy").closest<HTMLElement>(".ant-modal");
  if (!dialog) throw new Error("Không tìm thấy modal voucher giấy");
  return { dialog, onApply, onCancel };
};

const getOption = (batchCode: string) => screen.getByTestId(`paper-voucher-option-${batchCode}`);

const getSummaryValue = (label: string) => {
  const row = within(screen.getByTestId("paper-voucher-summary")).getByText(label).parentElement;
  return row?.lastElementChild?.textContent?.replace(/\s/g, "");
};

const money = (value: string) => value.replace(/\s/g, "");

describe("PaperVoucherDialog", () => {
  let paperVoucherServer: Awaited<ReturnType<typeof setupPaperVoucherServer>>;

  beforeEach(async () => {
    vi.stubEnv("VITE_PAPER_VOUCHER_SALE_ENABLED", "false");
    stubObjectUrls();
    paperVoucherServer = await setupPaperVoucherServer();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("shows batches from the API with unavailable reasons", async () => {
    const created: PaperVoucherBatch = {
      ...PAPER_VOUCHER_FIXTURES[3],
      id: 5,
      batchCode: "LÔ-005",
      name: "Voucher giấy 200.000đ",
      faceValue: 200000,
      totalQuantity: 10,
      validFrom: null,
      expiresAt: "2026-11-30"
    };
    await setupPaperVoucherServer({
      batches: [
        ...PAPER_VOUCHER_FIXTURES.map((batch) =>
          batch.id === 4 ? { ...batch, isLocked: true } : batch
        ),
        created
      ]
    });
    const { dialog } = renderDialog();

    expect(await screen.findByTestId("paper-voucher-option-LÔ-005")).toBeInTheDocument();
    expect(within(getOption("LÔ-001")).getByText("Hết hạn")).toBeInTheDocument();
    expect(within(getOption("LÔ-004")).getByText("Đã khóa")).toBeInTheDocument();
    expect(getOption("LÔ-004")).toHaveAttribute("aria-disabled", "true");
    expect(within(getOption("LÔ-004")).queryByText("Chọn")).not.toBeInTheDocument();
    expect(within(getOption("LÔ-003")).getByText(/Còn 114/)).toBeInTheDocument();
    expect(within(dialog).getByText("Chưa ghi nhận vào đơn bán vé")).toBeInTheDocument();
    expect(within(dialog).queryByText(/Dữ liệu mẫu/)).toBeNull();
  });

  it("explains that the system computes the amount when paper voucher sale is enabled", async () => {
    vi.stubEnv("VITE_PAPER_VOUCHER_SALE_ENABLED", "true");
    const { dialog } = renderDialog();
    await screen.findByTestId("paper-voucher-option-LÔ-003");

    expect(within(dialog).getByText("Chỉ thanh toán tiền mặt")).toBeInTheDocument();
    expect(within(dialog).queryByText("Chưa ghi nhận vào đơn bán vé")).toBeNull();
    expect(screen.getByTestId("paper-voucher-dialog-note")).toHaveTextContent(
      /không được hoàn lại/
    );
  });

  it("selects several batches without a ticket cap and does not compute order amounts", async () => {
    const { dialog, onApply } = renderDialog({ ticketCount: 1, ticketAmount: 90000 });
    await screen.findByTestId("paper-voucher-option-LÔ-003");

    fireEvent.click(getButtonByText(getOption("LÔ-003"), "Chọn"));
    fireEvent.click(getButtonByText(getOption("LÔ-004"), "Chọn"));

    expect(getSummaryValue("Số voucher giấy")).toBe("2");
    expect(getSummaryValue("Tổng mệnh giá voucher")).toBe(money("195.000 ₫"));
    // Số tiền áp dụng/khách cần trả do backend báo giá, dialog không tự tính.
    expect(screen.queryByTestId("paper-voucher-payable")).toBeNull();
    expect(screen.queryByText(/Giá trị áp dụng dự kiến/)).toBeNull();
    expect(within(dialog).queryByText(/vượt số vé/)).toBeNull();

    // Chỉ giới hạn theo số còn lại của lô (LÔ-003 còn 114), không theo số vé.
    expect(screen.getByLabelText("Số lượng LÔ-003")).toHaveAttribute("aria-valuemax", "114");
    expect(screen.getByLabelText("Tăng số lượng LÔ-003").closest("button")).toBeEnabled();

    fireEvent.click(getButtonByText(dialog, "Áp dụng"));
    expect(onApply).toHaveBeenCalledWith([
      { batchId: 3, quantity: 1, faceValue: 100000 },
      { batchId: 4, quantity: 1, faceValue: 95000 }
    ]);
  });

  it("changes and removes quantities for a selected batch", async () => {
    renderDialog({ ticketCount: 1, ticketAmount: 100000 });
    await screen.findByTestId("paper-voucher-option-LÔ-003");

    fireEvent.click(getButtonByText(getOption("LÔ-003"), "Chọn"));
    const quantity = screen.getByLabelText("Số lượng LÔ-003");
    fireEvent.change(quantity, { target: { value: "3" } });
    fireEvent.blur(quantity);

    expect(getSummaryValue("Số voucher giấy")).toBe("3");
    expect(getSummaryValue("Tổng mệnh giá voucher")).toBe(money("300.000 ₫"));
    expect(within(getOption("LÔ-004")).getByText("Chọn").closest("button")).toBeEnabled();
    expect(screen.getByLabelText("Tăng số lượng LÔ-003").closest("button")).toBeEnabled();

    fireEvent.click(screen.getByLabelText("Giảm số lượng LÔ-003"));
    expect(getSummaryValue("Số voucher giấy")).toBe("2");
    fireEvent.click(screen.getByLabelText("Giảm số lượng LÔ-003"));
    fireEvent.click(screen.getByLabelText("Giảm số lượng LÔ-003"));
    expect(getSummaryValue("Số voucher giấy")).toBe("0");
    expect(within(getOption("LÔ-003")).getByText("Chọn")).toBeInTheDocument();
  });

  it("selects a batch by clicking its card", async () => {
    renderDialog();
    await screen.findByTestId("paper-voucher-option-LÔ-004");

    fireEvent.click(getOption("LÔ-004"));
    expect(screen.getByLabelText("Số lượng LÔ-004")).toHaveValue("1");

    fireEvent.click(getOption("LÔ-001"));
    expect(getSummaryValue("Số voucher giấy")).toBe("1");
  });

  it("filters by face value", async () => {
    renderDialog();
    await screen.findByTestId("paper-voucher-option-LÔ-003");

    fireEvent.click(screen.getByText("95.000 ₫", { selector: ".ant-segmented-item-label" }));

    expect(screen.getByTestId("paper-voucher-option-LÔ-004")).toBeInTheDocument();
    expect(screen.queryByTestId("paper-voucher-option-LÔ-003")).not.toBeInTheDocument();
  });

  it("cancels without applying or recording usage", async () => {
    const { dialog, onApply, onCancel } = renderDialog();
    await screen.findByTestId("paper-voucher-option-LÔ-003");

    fireEvent.click(getButtonByText(getOption("LÔ-003"), "Chọn"));
    fireEvent.click(getButtonByText(dialog, "Hủy"));

    expect(onCancel).toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();
    expect(paperVoucherServer.requestBodies).toEqual([]);
    expect(paperVoucherServer.getBatch(3)?.usedCount).toBe(86);
  });

  it("shows the API error and blocks applying", async () => {
    server.use(
      http.get(`${PAPER_VOUCHER_TEST_BASE}/batches`, () =>
        HttpResponse.json(
          { statusCode: 403, message: "Bạn không có quyền thực hiện thao tác này" },
          { status: 403 }
        )
      )
    );
    const { dialog } = renderDialog();

    // Query mặc định thử lại 1 lần (~1s) trước khi báo lỗi.
    expect(
      await within(dialog).findByTestId("paper-voucher-load-error", {}, { timeout: 4000 })
    ).toHaveTextContent("Bạn không có quyền thực hiện thao tác này");
    expect(within(dialog).queryByTestId(/^paper-voucher-option-/)).toBeNull();
    expect(getButtonByText(dialog, "Áp dụng")).toBeDisabled();
  });
});
