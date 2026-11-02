import { initApi } from "@renderer/api/client";
import { formatMoney } from "@renderer/lib/utils";
import { useAuthStore } from "@renderer/store/auth.store";
import { server } from "@renderer/test/msw/server";
import type { PaperVoucherBatch } from "@shared/types";
import { http, HttpResponse } from "msw";
import { paperVoucherMockRepository } from "@renderer/features/vouchers/paperVouchers/paperVoucher.mock";
import {
  getButtonByText,
  PaperVoucherTestProviders,
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
  beforeEach(() => {
    paperVoucherMockRepository.reset();
    stubObjectUrls();
  });

  it("shows batches from the shared mock repository with unavailable reasons", async () => {
    const created = await paperVoucherMockRepository.create({
      name: "Voucher giấy 200.000đ",
      faceValue: 200000,
      totalQuantity: 10,
      expiresAt: "2026-11-30"
    });
    await paperVoucherMockRepository.setLocked({ id: 4, isLocked: true });
    renderDialog();

    expect(
      await screen.findByTestId(`paper-voucher-option-${created.batchCode}`)
    ).toBeInTheDocument();
    expect(within(getOption("LÔ-001")).getByText("Hết hạn")).toBeInTheDocument();
    expect(within(getOption("LÔ-004")).getByText("Đã khóa")).toBeInTheDocument();
    expect(getOption("LÔ-004")).toHaveAttribute("aria-disabled", "true");
    expect(within(getOption("LÔ-004")).queryByText("Chọn")).not.toBeInTheDocument();
    expect(within(getOption("LÔ-003")).getByText(/Còn 114/)).toBeInTheDocument();
    expect(screen.getByText("Dữ liệu mẫu · Chưa kết nối hệ thống")).toBeInTheDocument();
  });

  it("selects several batches, limits quantities to the seat count and computes totals", async () => {
    const { dialog, onApply } = renderDialog({ ticketCount: 2, ticketAmount: 180000 });
    await screen.findByTestId("paper-voucher-option-LÔ-003");

    fireEvent.click(getButtonByText(getOption("LÔ-003"), "Chọn"));
    fireEvent.click(getButtonByText(getOption("LÔ-004"), "Chọn"));

    expect(getSummaryValue("Số voucher giấy")).toBe("2");
    expect(getSummaryValue("Tổng mệnh giá voucher")).toBe(money("195.000 ₫"));
    expect(getSummaryValue("Giá trị áp dụng dự kiến")).toBe(money("180.000 ₫"));
    expect(screen.getByTestId("paper-voucher-payable").textContent?.replace(/\s/g, "")).toBe(
      money("0 ₫")
    );
    expect(screen.getByText(/Mệnh giá vượt tiền vé/)).toBeInTheDocument();

    expect(screen.getByLabelText("Số lượng LÔ-003")).toHaveAttribute("aria-valuemax", "1");

    fireEvent.click(getButtonByText(dialog, "Áp dụng"));
    expect(onApply).toHaveBeenCalledWith([
      { batchId: 3, quantity: 1, faceValue: 100000 },
      { batchId: 4, quantity: 1, faceValue: 95000 }
    ]);
  });

  it("changes and removes quantities for a selected batch", async () => {
    renderDialog({ ticketCount: 3, ticketAmount: 300000 });
    await screen.findByTestId("paper-voucher-option-LÔ-003");

    fireEvent.click(getButtonByText(getOption("LÔ-003"), "Chọn"));
    const quantity = screen.getByLabelText("Số lượng LÔ-003");
    fireEvent.change(quantity, { target: { value: "3" } });
    fireEvent.blur(quantity);

    expect(getSummaryValue("Tổng mệnh giá voucher")).toBe(money("300.000 ₫"));
    expect(screen.getByTestId("paper-voucher-payable").textContent?.replace(/\s/g, "")).toBe(
      money("0 ₫")
    );
    expect(within(getOption("LÔ-004")).getByText("Chọn").closest("button")).toBeDisabled();

    expect(screen.getByLabelText("Tăng số lượng LÔ-003").closest("button")).toBeDisabled();
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
    expect((await paperVoucherMockRepository.list()).find((item) => item.id === 3)?.usedCount).toBe(
      86
    );
    expect(await paperVoucherMockRepository.listUsages(3)).toEqual([]);
  });
});

describe("PaperVoucherDialog with the real API", () => {
  const API = "http://paper-voucher.test";
  const BASE = `${API}/api/pos/paper-vouchers`;
  const serverBatch: PaperVoucherBatch = {
    id: 21,
    batchCode: "LÔ-021",
    name: "Voucher giấy hệ thống",
    faceValue: 75000,
    totalQuantity: 40,
    usedCount: 0,
    remainingQuantity: 40,
    validFrom: null,
    expiresAt: "2027-03-31",
    isLocked: false,
    status: "active",
    note: null,
    images: [],
    createdAt: "2026-10-01 08:00:00",
    updatedAt: "2026-10-01 08:00:00",
    createdBy: "admin",
    updatedBy: "admin",
    lockedAt: null,
    lockedBy: null
  };

  beforeEach(async () => {
    vi.stubEnv("VITE_PAPER_VOUCHER_DATA_SOURCE", "http");
    await initApi(API);
    useAuthStore.getState().login("staff-token", "staff-refresh", 12);
    paperVoucherMockRepository.reset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("lists server batches for selection without reading mock data", async () => {
    const listSpy = vi.spyOn(paperVoucherMockRepository, "list");
    server.use(
      http.get(`${BASE}/batches`, () =>
        HttpResponse.json({ data: [serverBatch], total: 1, current: 1, pageSize: 0 })
      )
    );
    const { dialog, onApply } = renderDialog({ ticketCount: 2, ticketAmount: 180000 });

    fireEvent.click(await within(dialog).findByText("Voucher giấy hệ thống"));
    expect(within(dialog).getByText("Chưa ghi nhận vào đơn bán vé")).toBeInTheDocument();
    expect(within(dialog).queryByText("Dữ liệu mẫu · Chưa kết nối hệ thống")).toBeNull();
    expect(money(screen.getByTestId("paper-voucher-payable").textContent ?? "")).toBe(
      money(formatMoney(105000))
    );

    fireEvent.click(getButtonByText(dialog, "Áp dụng"));
    expect(onApply).toHaveBeenCalledWith([{ batchId: 21, quantity: 1, faceValue: 75000 }]);
    expect(listSpy).not.toHaveBeenCalled();
  });

  it("shows the API error instead of falling back to mock batches", async () => {
    server.use(
      http.get(`${BASE}/batches`, () =>
        HttpResponse.json(
          { statusCode: 403, message: "Bạn không có quyền thực hiện thao tác này" },
          { status: 403 }
        )
      )
    );
    const { dialog } = renderDialog();

    expect(await within(dialog).findByTestId("paper-voucher-load-error")).toHaveTextContent(
      "Bạn không có quyền thực hiện thao tác này"
    );
    expect(within(dialog).queryByTestId(/^paper-voucher-option-/)).toBeNull();
    expect(getButtonByText(dialog, "Áp dụng")).toBeDisabled();
  });
});
