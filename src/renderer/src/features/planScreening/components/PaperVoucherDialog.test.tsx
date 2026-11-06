import { server } from "@renderer/test/msw/server";
import type { PaperVoucherBatch, PaperVoucherOrderQuote } from "@shared/types";
import { http, HttpResponse } from "msw";
import {
  getButtonByText,
  PAPER_VOUCHER_FIXTURES,
  PAPER_VOUCHER_TEST_BASE,
  PaperVoucherTestProviders,
  setupPaperVoucherServer,
  stubObjectUrls
} from "@renderer/features/paperVouchers/paperVoucher.testUtils";
import type { PaperVoucherSelectionLine } from "@renderer/features/paperVouchers/paperVoucherRedemption";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PaperVoucherDialog, { type PaperVoucherAppliedQuote } from "./PaperVoucherDialog";

vi.mock("@renderer/features/paperVouchers/paperVoucher.utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@renderer/features/paperVouchers/paperVoucher.utils")>()),
  getVietnamBusinessDate: () => "2026-10-30"
}));

const createQuote = (): PaperVoucherOrderQuote => ({
  businessDate: "2026-10-30",
  orderTotal: 180000,
  orderDiscount: 0,
  voucherQuantity: 1,
  faceValueTotal: 100000,
  voucherApplied: 100000,
  remainingPayable: 80000,
  excessAmount: 0,
  lines: [],
  allowedPaymentMethods: ["POS"],
  warnings: [],
  quoteHash: "a".repeat(64)
});

const renderDialog = ({
  value = [],
  ticketCount = 2,
  ticketAmount = 180000,
  discountAmount = 0,
  draftQuote,
  onClear,
  onDraftChange
}: {
  value?: PaperVoucherSelectionLine[];
  ticketCount?: number;
  ticketAmount?: number;
  discountAmount?: number;
  draftQuote?: PaperVoucherAppliedQuote;
  onClear?: () => void;
  onDraftChange?: (lines: PaperVoucherSelectionLine[]) => void;
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
        draftQuote={draftQuote}
        onDraftChange={onDraftChange}
        onClear={onClear}
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

/** Số tờ voucher hiển thị cạnh "Mệnh giá voucher" (vd. "· 2 tờ"). */
const getVoucherCount = () =>
  within(screen.getByTestId("paper-voucher-summary"))
    .getByText(/^· \d+ tờ$/)
    .textContent?.match(/\d+/)?.[0];

const money = (value: string) => value.replace(/\s/g, "");
const textOf = (testId: string) => screen.getByTestId(testId).textContent?.replace(/\s/g, "");

describe("PaperVoucherDialog", () => {
  let paperVoucherServer: Awaited<ReturnType<typeof setupPaperVoucherServer>>;

  beforeEach(async () => {
    stubObjectUrls();
    paperVoucherServer = await setupPaperVoucherServer();
  });

  it("lists only usable batches from the API", async () => {
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
    // Lô hết hạn (LÔ-001) và bị khóa (LÔ-004) không hiện trong danh sách chọn.
    expect(screen.queryByTestId("paper-voucher-option-LÔ-001")).toBeNull();
    expect(screen.queryByTestId("paper-voucher-option-LÔ-004")).toBeNull();
    expect(within(dialog).queryByText(/Không khả dụng/)).toBeNull();
    expect(within(getOption("LÔ-003")).getByText(/Còn 114/)).toBeInTheDocument();
    expect(within(dialog).queryByText(/Dữ liệu mẫu/)).toBeNull();
  });

  it("marks vouchers as cash-equivalent without long instructions", async () => {
    const { dialog } = renderDialog();
    await screen.findByTestId("paper-voucher-option-LÔ-003");

    expect(within(dialog).getByText("Tương đương tiền mặt")).toBeInTheDocument();
    expect(within(dialog).queryByText("Chưa ghi nhận vào đơn bán vé")).toBeNull();
    expect(within(dialog).queryByText(/Bấm Áp dụng/)).toBeNull();
    expect(within(dialog).queryByText(/không làm giảm giá vé/)).toBeNull();
  });

  it("selects several batches without a ticket cap and does not compute order amounts", async () => {
    const { dialog, onApply } = renderDialog({ ticketCount: 1, ticketAmount: 90000 });
    await screen.findByTestId("paper-voucher-option-LÔ-003");

    fireEvent.click(getButtonByText(getOption("LÔ-003"), "Chọn"));
    fireEvent.click(getButtonByText(getOption("LÔ-004"), "Chọn"));

    expect(getVoucherCount()).toBe("2");
    expect(getSummaryValue("Mệnh giá voucher")).toBe(money("195.000 ₫"));
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

    expect(getVoucherCount()).toBe("3");
    expect(getSummaryValue("Mệnh giá voucher")).toBe(money("300.000 ₫"));
    expect(within(getOption("LÔ-004")).getByText("Chọn").closest("button")).toBeEnabled();
    expect(screen.getByLabelText("Tăng số lượng LÔ-003").closest("button")).toBeEnabled();

    fireEvent.click(screen.getByLabelText("Giảm số lượng LÔ-003"));
    expect(getVoucherCount()).toBe("2");
    fireEvent.click(screen.getByLabelText("Giảm số lượng LÔ-003"));
    fireEvent.click(screen.getByLabelText("Giảm số lượng LÔ-003"));
    expect(getVoucherCount()).toBe("0");
    expect(within(getOption("LÔ-003")).getByText("Chọn")).toBeInTheDocument();
  });

  it("selects a batch by clicking its card", async () => {
    renderDialog();
    await screen.findByTestId("paper-voucher-option-LÔ-004");

    fireEvent.click(getOption("LÔ-004"));
    expect(screen.getByLabelText("Số lượng LÔ-004")).toHaveValue("1");

    expect(getVoucherCount()).toBe("1");
  });

  it("keeps a selected batch that became unusable so the cashier can remove it", async () => {
    await setupPaperVoucherServer({
      batches: PAPER_VOUCHER_FIXTURES.map((batch) =>
        batch.id === 4 ? { ...batch, isLocked: true } : batch
      )
    });
    renderDialog({ value: [{ batchId: 4, quantity: 1, faceValue: 95000 }] });
    await screen.findByTestId("paper-voucher-option-LÔ-003");

    expect(within(getOption("LÔ-004")).getByText("Đã khóa")).toBeInTheDocument();
    expect(screen.getByTestId("paper-voucher-selection-error")).toBeInTheDocument();
  });

  it("lists every face value in one list without a face value filter", async () => {
    const { dialog } = renderDialog();
    await screen.findByTestId("paper-voucher-option-LÔ-003");

    expect(screen.getByTestId("paper-voucher-option-LÔ-004")).toBeInTheDocument();
    expect(dialog.querySelector(".ant-segmented")).toBeNull();
  });

  it("shows the amount the customer still pays for the selection being edited", async () => {
    const onClear = vi.fn();
    const onDraftChange = vi.fn();
    const { dialog } = renderDialog({
      value: [{ batchId: 3, quantity: 1, faceValue: 100000 }],
      ticketCount: 2,
      ticketAmount: 180000,
      draftQuote: {
        quote: createQuote(),
        isLoading: false,
        paymentMethodLabel: "Tiền mặt",
        onRetry: vi.fn()
      },
      onClear,
      onDraftChange
    });
    await screen.findByTestId("paper-voucher-option-LÔ-003");

    expect(textOf("paper-voucher-remaining")).toBe(money("80.000 ₫"));
    expect(screen.getByTestId("paper-voucher-payment-method")).toHaveTextContent("Tiền mặt");
    expect(textOf("paper-voucher-order-total")).toBe(money("180.000 ₫"));
    expect(textOf("paper-voucher-applied")).toBe(`−${money("100.000 ₫")}`);

    // Sửa bản nháp: báo cho bên gọi báo giá lại ngay, không chờ bấm Áp dụng.
    fireEvent.click(getButtonByText(getOption("LÔ-004"), "Chọn"));
    expect(onDraftChange).toHaveBeenLastCalledWith([
      { batchId: 3, quantity: 1, faceValue: 100000 },
      { batchId: 4, quantity: 1, faceValue: 95000 }
    ]);

    fireEvent.click(getButtonByText(dialog, "Bỏ áp dụng"));
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onDraftChange).toHaveBeenLastCalledWith([]);
    expect(getVoucherCount()).toBe("0");
  });

  it("clears the whole draft with Bỏ chọn tất cả without applying", async () => {
    const onDraftChange = vi.fn();
    const { dialog, onApply } = renderDialog({ onDraftChange });
    await screen.findByTestId("paper-voucher-option-LÔ-003");
    expect(within(dialog).queryByText("Bỏ chọn tất cả")).toBeNull();

    fireEvent.click(getButtonByText(getOption("LÔ-003"), "Chọn"));
    fireEvent.click(getButtonByText(getOption("LÔ-004"), "Chọn"));
    expect(getVoucherCount()).toBe("2");

    fireEvent.click(getButtonByText(dialog, "Bỏ chọn tất cả"));
    expect(getVoucherCount()).toBe("0");
    expect(onDraftChange).toHaveBeenLastCalledWith([]);
    expect(within(getOption("LÔ-003")).getByText("Chọn")).toBeInTheDocument();
    expect(within(dialog).queryByText("Bỏ chọn tất cả")).toBeNull();
    expect(onApply).not.toHaveBeenCalled();
  });

  it("does not offer to clear when nothing is applied", async () => {
    const { dialog } = renderDialog({ onClear: vi.fn() });
    await screen.findByTestId("paper-voucher-option-LÔ-003");

    expect(within(dialog).queryByText("Bỏ áp dụng")).toBeNull();
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
