import { initApi } from "@renderer/api/client";
import { server } from "@renderer/test/msw/server";
import { useAuthStore } from "@renderer/store/auth.store";
import type { PaperVoucherBatch, PaperVoucherSummary } from "@shared/types";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { paperVoucherMockRepository } from "./paperVoucher.mock";
import {
  findModalByTitle,
  getButtonByText,
  PaperVoucherTestProviders,
  searchPaperVoucherKeyword
} from "./paperVoucher.testUtils";
import type { PaperVoucherPermissions } from "./paperVoucherPermissions";
import PaperVouchersTab from "./PaperVouchersTab";

vi.mock("@renderer/socket/socket", () => ({
  connectSocket: vi.fn(),
  disconnectSocket: vi.fn()
}));

vi.mock("./paperVoucher.utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./paperVoucher.utils")>()),
  getVietnamBusinessDate: () => "2026-11-02"
}));

const API = "http://paper-voucher.test";
const BASE = `${API}/api/pos/paper-vouchers`;

const FULL_ACCESS: PaperVoucherPermissions = {
  access: true,
  list: true,
  view: true,
  create: true,
  update: true,
  delete: true
};

const serverBatch: PaperVoucherBatch = {
  id: 21,
  batchCode: "LÔ-021",
  name: "Voucher giấy MSSQL",
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
  createdAt: "2026-11-02 08:00:00",
  updatedAt: "2026-11-02 08:00:00",
  createdBy: "thungan",
  updatedBy: "thungan",
  lockedAt: null,
  lockedBy: null
};

const summary: PaperVoucherSummary = {
  totalBatches: 1,
  totalQuantity: 40,
  usedCount: 0,
  remainingQuantity: 40,
  totalFaceValue: 3000000,
  usedFaceValue: 0,
  remainingFaceValue: 3000000,
  countByStatus: { active: 1, upcoming: 0, expired: 0, locked: 0, depleted: 0 },
  businessDate: "2026-11-02"
};

const page = (data: PaperVoucherBatch[], pageSize = 20) => ({
  data,
  total: data.length,
  current: 1,
  pageCount: 1,
  pageSize
});

/** Hiển thị nút thao tác mà tab đẩy lên thanh tab, giống `VouchersPage`. */
const TabHarness = () => {
  const [actions, setActions] = useState<ReactNode>(null);

  return (
    <>
      <div>{actions}</div>
      <PaperVouchersTab permissions={FULL_ACCESS} onActionsChange={setActions} />
    </>
  );
};

const renderTab = () =>
  render(
    <PaperVoucherTestProviders>
      <TabHarness />
    </PaperVoucherTestProviders>
  );

describe("PaperVouchersTab with the real API", { timeout: 20_000 }, () => {
  let pageQueries: URLSearchParams[];

  beforeEach(async () => {
    vi.stubEnv("VITE_PAPER_VOUCHER_DATA_SOURCE", "http");
    await initApi(API);
    useAuthStore.getState().login("staff-token", "staff-refresh", 12);
    paperVoucherMockRepository.reset();
    pageQueries = [];
    server.use(
      http.get(`${BASE}/batches`, ({ request }) => {
        const params = new URL(request.url).searchParams;
        // pageSize=0 là request lấy toàn bộ lô cho bộ lọc.
        if (params.get("pageSize") !== "0") pageQueries.push(params);
        return HttpResponse.json(page([serverBatch], Number(params.get("pageSize"))));
      }),
      http.get(`${BASE}/summary`, () => HttpResponse.json(summary))
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders server rows and summary without the mock data label", async () => {
    renderTab();

    expect(await screen.findByText("LÔ-021")).toBeInTheDocument();
    expect(screen.queryByText("LÔ-001")).not.toBeInTheDocument();
    expect(screen.queryByText("Dữ liệu mẫu")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId("paper-voucher-stat-issued")).toHaveTextContent("40")
    );
    expect(screen.getByTestId("paper-voucher-stat-batches")).toHaveTextContent("1 lô đang áp dụng");
    expect(Object.fromEntries(pageQueries[0])).toEqual({ current: "1", pageSize: "20" });
  });

  it("sends the popup search and column sort to the server", async () => {
    renderTab();
    await screen.findByText("LÔ-021");

    await searchPaperVoucherKeyword("  mssql ");
    await waitFor(() => expect(pageQueries.at(-1)?.get("keyword")).toBe("mssql"), {
      timeout: 4000
    });

    const header = screen.getByText("Mệnh giá", { selector: "th, th *" }).closest("th");
    if (!header) throw new Error("Không tìm thấy cột Mệnh giá");
    fireEvent.click(header);
    await waitFor(() => expect(pageQueries.at(-1)?.get("sort")).toBe("faceValue.asc"));
    expect(pageQueries.at(-1)?.get("keyword")).toBe("mssql");
    expect(pageQueries.at(-1)?.get("current")).toBe("1");
  });

  it("creates a batch through the API and shows a real (non-mock) success message", async () => {
    let createBody: unknown;
    server.use(
      http.post(`${BASE}/batches`, async ({ request }) => {
        createBody = await request.json();
        return HttpResponse.json({ ...serverBatch, id: 22, batchCode: "LÔ-022" }, { status: 201 });
      })
    );
    renderTab();
    await screen.findByText("LÔ-021");

    fireEvent.click(getButtonByText(document.body, "Tạo lô Voucher"));
    const dialog = await findModalByTitle("Tạo lô voucher giấy");
    fireEvent.change(within(dialog).getByLabelText("Tên lô"), {
      target: { value: "Voucher giấy 50.000đ" }
    });
    fireEvent.change(within(dialog).getByLabelText("Mệnh giá (VNĐ)"), {
      target: { value: "50000" }
    });
    fireEvent.change(within(dialog).getByLabelText("Số lượng phát hành"), {
      target: { value: "10" }
    });
    fireEvent.click(getButtonByText(dialog, "Tạo lô"));

    // Validate form + gọi API + đóng dialog: chậm hơn 1s mặc định khi chạy song song nhiều file.
    expect(await screen.findByText("Đã tạo lô voucher", {}, { timeout: 4000 })).toBeInTheDocument();
    expect(createBody).toEqual({
      name: "Voucher giấy 50.000đ",
      faceValue: 50000,
      totalQuantity: 10,
      validFrom: null,
      expiresAt: null,
      note: null
    });
  });

  it("shows the API failure instead of falling back to mock rows", async () => {
    server.use(
      http.get(`${BASE}/batches`, () =>
        HttpResponse.json({ statusCode: 500, message: "Lỗi máy chủ" }, { status: 500 })
      ),
      http.get(`${BASE}/summary`, () =>
        HttpResponse.json({ statusCode: 500, message: "Lỗi máy chủ" }, { status: 500 })
      )
    );
    renderTab();

    expect(await screen.findByText("Lỗi máy chủ", {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.queryByText("Chưa có lô voucher giấy")).not.toBeInTheDocument();
    expect(screen.queryByText("LÔ-001")).not.toBeInTheDocument();
    expect(screen.getByTestId("paper-voucher-stat-batches")).toHaveTextContent("0");
  });
});
