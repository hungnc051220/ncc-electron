import { SERVER_ERROR_HINT } from "@renderer/lib/apiError";
import { usePermissionStore } from "@renderer/store/permission.store";
import { server } from "@renderer/test/msw/server";
import type { PaperVoucherBatch, PaperVoucherUsage } from "@shared/types";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPaperVoucherFilters,
  createPaperVoucherImage,
  findModalByTitle,
  getButtonByText,
  PAPER_VOUCHER_FIXTURES,
  PAPER_VOUCHER_TEST_BASE,
  PaperVoucherTestProviders,
  searchPaperVoucherKeyword,
  setupPaperVoucherServer,
  stubObjectUrls
} from "./paperVoucher.testUtils";
import {
  PAPER_VOUCHER_PERMISSION_KEY,
  type PaperVoucherPermissions
} from "./paperVoucherPermissions";
import PaperVouchersPage from "./PaperVouchersPage";

// Cố định ngày nghiệp vụ VN để trạng thái lô ổn định (không fake Date vì ảnh hưởng timer của antd).
vi.mock("./paperVoucher.utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./paperVoucher.utils")>()),
  getVietnamBusinessDate: () => "2026-10-30"
}));

// Popup "Thông tin bán vé" có test riêng; ở đây chỉ cần biết mã đơn nào được mở.
vi.mock("@renderer/features/orderHistory/components/OrderDetailDialog", () => ({
  default: ({ selectedOrderId }: { selectedOrderId?: number | null }) => (
    <div data-testid="order-detail-dialog">{selectedOrderId}</div>
  )
}));

const FULL_ACCESS: PaperVoucherPermissions = {
  access: true,
  list: true,
  view: true,
  create: true,
  update: true,
  delete: true
};

const renderPage = (permissions: Partial<PaperVoucherPermissions> = FULL_ACCESS) => {
  usePermissionStore.setState({
    assignments: [
      { permissionKey: PAPER_VOUCHER_PERMISSION_KEY, actions: { ...FULL_ACCESS, ...permissions } }
    ]
  });

  return render(
    <PaperVoucherTestProviders>
      <Routes>
        <Route path="/paper-vouchers" element={<PaperVouchersPage />} />
        <Route path="/403" element={<div>Trang 403</div>} />
      </Routes>
    </PaperVoucherTestProviders>
  );
};

const getRow = (batchCode: string) => {
  const row = screen.getByText(batchCode).closest("tr");
  if (!row) throw new Error(`Row ${batchCode} not found`);
  return row;
};

const getBatchCodesInOrder = () =>
  screen.getAllByText(/^LÔ-\d{3}$/).map((element) => element.textContent);

const openRowMenu = async (batchCode: string) => {
  fireEvent.click(screen.getByLabelText(`Thao tác lô ${batchCode}`));
  // Popup Dropdown cũ vẫn có thể nằm trong DOM; popup vừa mở luôn gắn cuối body.
  return waitFor(() => {
    const menus = document.querySelectorAll<HTMLElement>(
      ".ant-dropdown:not(.ant-dropdown-hidden) [role='menu']"
    );
    if (!menus.length) throw new Error("Menu thao tác chưa mở");
    return menus[menus.length - 1];
  });
};

const getHeaderCell = (title: string) => {
  const cell = screen.getByText(title, { selector: "th, th *" }).closest("th");
  if (!cell) throw new Error(`Không tìm thấy cột ${title}`);
  return cell;
};

const changeInput = (dialog: HTMLElement, label: string, value: string) => {
  fireEvent.change(within(dialog).getByLabelText(label), { target: { value } });
};

/** Bộ lô mẫu với ảnh gắn cho các lô theo id. */
const withImages = (imagesById: Record<number, string[]>): PaperVoucherBatch[] =>
  PAPER_VOUCHER_FIXTURES.map((batch) => ({
    ...batch,
    images: (imagesById[batch.id] ?? []).map(createPaperVoucherImage)
  }));

/** Body 500 của backend cũ: `HttpExceptionFilter` trả nguyên văn lỗi driver SQL. */
const RAW_SQL_MESSAGE =
  "The INSERT permission was denied on the object 'StaffAuditLog', database 'CinemaTicketDev', schema 'dbo'.";

// Bảng antd trong jsdom render chậm; mỗi luồng gồm nhiều lần tải lại trang, thống kê và bộ lọc.
// Validate form antd + gọi API chậm hơn 1s mặc định khi chạy song song nhiều file.
const slow = { timeout: 4000 };

describe("PaperVouchersPage", { timeout: 20_000 }, () => {
  beforeEach(() => {
    stubObjectUrls();
  });

  it("renders summary cards and computed statuses from the API", async () => {
    await setupPaperVoucherServer();
    renderPage();

    expect(await screen.findByText("LÔ-001")).toBeInTheDocument();
    expect(screen.queryByText("Dữ liệu mẫu")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId("paper-voucher-stat-issued")).toHaveTextContent("1,100")
    );
    expect(screen.getByTestId("paper-voucher-stat-batches")).toHaveTextContent("4");
    expect(screen.getByTestId("paper-voucher-stat-batches")).toHaveTextContent("2 lô đang áp dụng");
    expect(screen.getByTestId("paper-voucher-stat-used")).toHaveTextContent("654");
    expect(screen.getByTestId("paper-voucher-stat-remaining")).toHaveTextContent("446");
    expect(within(getRow("LÔ-001")).getByText("Hết hạn")).toBeInTheDocument();
    expect(within(getRow("LÔ-002")).getByText("Hết hạn")).toBeInTheDocument();
    expect(within(getRow("LÔ-003")).getByText("Đang áp dụng")).toBeInTheDocument();
  });

  it("groups validity dates under one Hạn sử dụng header", async () => {
    await setupPaperVoucherServer();
    renderPage();
    await screen.findByText("LÔ-001");

    expect(getHeaderCell("Hạn sử dụng")).toHaveAttribute("colspan", "2");
    expect(getHeaderCell("Từ ngày")).toBeInTheDocument();
    expect(getHeaderCell("Đến ngày")).toBeInTheDocument();

    expect(within(getRow("LÔ-001")).getByText("01/01/2025")).toBeInTheDocument();
    expect(within(getRow("LÔ-001")).getByText("31/12/2025")).toBeInTheDocument();
    expect(within(getRow("LÔ-002")).getByText("--")).toBeInTheDocument();
  });

  it("requests the first page in the backend default order", async () => {
    const { pageQueries } = await setupPaperVoucherServer();
    renderPage();
    await screen.findByText("LÔ-001");

    expect(getBatchCodesInOrder()).toEqual(["LÔ-004", "LÔ-003", "LÔ-002", "LÔ-001"]);
    expect(Object.fromEntries(pageQueries[0])).toEqual({ current: "1", pageSize: "20" });
  });

  it("sends column sorts and the popup search to the server", async () => {
    const { pageQueries } = await setupPaperVoucherServer();
    renderPage();
    await screen.findByText("LÔ-001");

    fireEvent.click(getHeaderCell("Từ ngày"));
    await waitFor(() => expect(pageQueries.at(-1)?.get("sort")).toBe("validFrom.asc"));

    // Bấm hai lần = giảm dần theo HSD.
    fireEvent.click(getHeaderCell("Đến ngày"));
    fireEvent.click(getHeaderCell("Đến ngày"));
    await waitFor(() => expect(pageQueries.at(-1)?.get("sort")).toBe("expiresAt.desc"));
    expect(getHeaderCell("Đến ngày")).toHaveAttribute("aria-sort", "descending");

    await searchPaperVoucherKeyword("  lo-004 ");
    await waitFor(() => expect(pageQueries.at(-1)?.get("keyword")).toBe("lo-004"), {
      timeout: 4000
    });
    expect(pageQueries.at(-1)?.get("sort")).toBe("expiresAt.desc");
    expect(pageQueries.at(-1)?.get("current")).toBe("1");
  });

  it("shows batches without an expiry date", async () => {
    await setupPaperVoucherServer({
      batches: PAPER_VOUCHER_FIXTURES.map((batch) =>
        batch.id === 4 ? { ...batch, expiresAt: null } : batch
      )
    });
    renderPage();
    await screen.findByText("LÔ-004");

    expect(within(getRow("LÔ-004")).getByText("Không thời hạn")).toBeInTheDocument();
    expect(within(getRow("LÔ-004")).getByText("Đang áp dụng")).toBeInTheDocument();
  });

  it("searches from the filter popup, shows empty state and clears filters", async () => {
    await setupPaperVoucherServer();
    renderPage();
    await screen.findByText("LÔ-001");
    // Cộng thời gian render bảng khi chạy song song nhiều file test.
    const searchWait = { timeout: 4000 };

    await searchPaperVoucherKeyword("lo-004");
    await waitFor(() => expect(getBatchCodesInOrder()).toEqual(["LÔ-004"]), searchWait);
    expect(
      document.querySelector('button[aria-label="Bộ lọc, 1 bộ lọc đang áp dụng"]')
    ).toBeInTheDocument();

    await searchPaperVoucherKeyword("không tồn tại");
    expect(
      await screen.findByText("Không có lô voucher phù hợp với bộ lọc", {}, searchWait)
    ).toBeInTheDocument();

    await clearPaperVoucherFilters();
    await waitFor(() => expect(getBatchCodesInOrder()).toHaveLength(4), searchWait);
    expect(document.querySelector('button[aria-label="Bộ lọc"]')).toBeInTheDocument();
  });

  it("shows the first image as thumbnail, placeholders and previews from the table", async () => {
    await setupPaperVoucherServer({
      batches: withImages({ 4: ["mot.png"], 3: ["dau.png", "hai.png", "ba.png"] })
    });
    renderPage();
    await screen.findByText("LÔ-001");

    expect(within(getRow("LÔ-001")).getByLabelText("Lô LÔ-001 chưa có ảnh")).toBeInTheDocument();
    expect(within(getRow("LÔ-004")).getByAltText("Ảnh voucher LÔ-004")).toHaveAttribute(
      "src",
      createPaperVoucherImage("mot.png").url
    );

    const firstImageUrl = createPaperVoucherImage("dau.png").url;
    const thumbnail = within(getRow("LÔ-003")).getByAltText("Ảnh voucher LÔ-003");
    expect(thumbnail).toHaveAttribute("src", firstImageUrl);

    fireEvent.click(thumbnail);
    await waitFor(() =>
      expect(
        document.querySelector(`.ant-image-preview-img[src='${firstImageUrl}']`)
      ).toBeInTheDocument()
    );
  });

  it("validates and creates a new batch through the API", async () => {
    const { requestBodies } = await setupPaperVoucherServer();
    renderPage();
    await screen.findByText("LÔ-001");

    fireEvent.click(getButtonByText(document.body, "Tạo lô Voucher"));
    const dialog = await findModalByTitle("Tạo lô voucher giấy");

    fireEvent.click(getButtonByText(dialog, "Tạo lô"));
    expect(await within(dialog).findByText("Nhập tên lô", {}, slow)).toBeInTheDocument();
    expect(within(dialog).getByText("Nhập mệnh giá")).toBeInTheDocument();

    changeInput(dialog, "Tên lô", "Voucher giấy 200.000đ");
    changeInput(dialog, "Mệnh giá (VNĐ)", "200000");
    changeInput(dialog, "Số lượng phát hành", "50");
    const expiresAt = within(dialog).getByLabelText("Ngày hết hạn");
    fireEvent.mouseDown(expiresAt);
    fireEvent.change(expiresAt, { target: { value: "30/06/2027" } });
    fireEvent.keyDown(expiresAt, { key: "Enter", code: "Enter" });

    await waitFor(() =>
      expect(within(dialog).getByTestId("paper-voucher-total-value")).toHaveTextContent(
        /10\.000\.000/
      )
    );

    fireEvent.click(getButtonByText(dialog, "Tạo lô"));

    expect(await screen.findByText("LÔ-005", {}, slow)).toBeInTheDocument();
    expect(screen.getByText("Đã tạo lô voucher")).toBeInTheDocument();
    expect(requestBodies).toEqual([
      {
        method: "POST",
        path: "/api/pos/paper-vouchers/batches",
        body: {
          name: "Voucher giấy 200.000đ",
          faceValue: 200000,
          totalQuantity: 50,
          validFrom: null,
          expiresAt: "2027-06-30",
          note: null
        }
      }
    ]);
    await waitFor(() =>
      expect(screen.getByTestId("paper-voucher-stat-issued")).toHaveTextContent("1,150")
    );
  });

  it("locks history fields when editing a used batch and keeps its image", async () => {
    const image = createPaperVoucherImage("truoc.png");
    const { requestBodies } = await setupPaperVoucherServer({
      batches: withImages({ 3: ["truoc.png"] })
    });
    renderPage();
    await screen.findByText("LÔ-003");

    fireEvent.click(within(await openRowMenu("LÔ-003")).getByText("Chỉnh sửa"));
    const dialog = await findModalByTitle("Chỉnh sửa lô voucher giấy");

    expect(within(dialog).getByText(/Lô đã ghi nhận 86 lượt sử dụng/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Mệnh giá (VNĐ)")).toBeDisabled();
    expect(within(dialog).getByLabelText("Ngày hết hạn")).toBeDisabled();

    changeInput(dialog, "Số lượng phát hành", "50");
    fireEvent.click(getButtonByText(dialog, "Lưu thay đổi"));
    expect(
      await within(dialog).findByText("Không được nhỏ hơn số đã sử dụng (86)", {}, slow)
    ).toBeInTheDocument();

    changeInput(dialog, "Tên lô", "Voucher giấy 100K - bổ sung");
    changeInput(dialog, "Số lượng phát hành", "250");
    fireEvent.click(getButtonByText(dialog, "Lưu thay đổi"));

    expect(await screen.findByText("Voucher giấy 100K - bổ sung", {}, slow)).toBeInTheDocument();
    expect(screen.getByText("Đã cập nhật lô voucher")).toBeInTheDocument();
    expect(requestBodies.at(-1)).toMatchObject({
      method: "PATCH",
      path: "/api/pos/paper-vouchers/batches/3",
      body: { name: "Voucher giấy 100K - bổ sung", totalQuantity: 250 }
    });
    expect(within(getRow("LÔ-003")).getByAltText("Ảnh voucher LÔ-003")).toHaveAttribute(
      "src",
      image.url
    );
  });

  it("locks a batch after confirmation without losing usage", async () => {
    const { requestBodies } = await setupPaperVoucherServer();
    renderPage();
    await screen.findByText("LÔ-003");

    fireEvent.click(within(await openRowMenu("LÔ-003")).getByText("Khóa lô"));
    fireEvent.click(getButtonByText(await findModalByTitle("Xác nhận khóa lô voucher"), "Khóa lô"));

    await waitFor(() => expect(within(getRow("LÔ-003")).getByText("Đã khóa")).toBeInTheDocument());
    expect(within(getRow("LÔ-003")).getByText("86")).toBeInTheDocument();
    expect(requestBodies).toEqual([
      { method: "PATCH", path: "/api/pos/paper-vouchers/batches/3/lock", body: { isLocked: true } }
    ]);
  });

  it("unlocks a locked batch after confirmation", async () => {
    await setupPaperVoucherServer({
      batches: PAPER_VOUCHER_FIXTURES.map((batch) =>
        batch.id === 3 ? { ...batch, isLocked: true } : batch
      )
    });
    renderPage();
    expect(await screen.findByText("Đã khóa")).toBeInTheDocument();

    fireEvent.click(within(await openRowMenu("LÔ-003")).getByText("Mở khóa"));
    fireEvent.click(
      getButtonByText(await findModalByTitle("Xác nhận mở khóa lô voucher"), "Mở khóa")
    );

    await waitFor(() =>
      expect(within(getRow("LÔ-003")).getByText("Đang áp dụng")).toBeInTheDocument()
    );
  });

  it("blocks deleting used batches and deletes unused ones", async () => {
    const { getBatch } = await setupPaperVoucherServer();
    renderPage();
    await screen.findByText("LÔ-003");

    const usedMenu = await openRowMenu("LÔ-003");
    expect(
      within(usedMenu).getByText("Xóa lô (đã có lượt sử dụng)").closest("[role='menuitem']")
    ).toHaveAttribute("aria-disabled", "true");

    fireEvent.click(within(await openRowMenu("LÔ-004")).getByText("Xóa lô"));
    fireEvent.click(getButtonByText(await findModalByTitle("Xác nhận xóa lô voucher"), "Xóa"));

    await waitFor(() => expect(screen.queryByText("LÔ-004")).not.toBeInTheDocument());
    expect(getBatch(4)).toBeUndefined();
    await waitFor(() =>
      expect(screen.getByTestId("paper-voucher-stat-batches")).toHaveTextContent("3")
    );
  });

  it("shows every image in its stored order in details and previews them", async () => {
    const fileNames = ["truoc.png", "sau.png", "phu-luc.png"];
    await setupPaperVoucherServer({ batches: withImages({ 3: fileNames }) });
    renderPage();
    await screen.findByText("LÔ-003");

    fireEvent.click(within(await openRowMenu("LÔ-003")).getByText("Xem chi tiết"));
    const dialog = await findModalByTitle("Chi tiết lô LÔ-003");

    const images = fileNames.map(createPaperVoucherImage);
    expect(within(dialog).getByAltText("Ảnh 1 voucher LÔ-003")).toHaveAttribute(
      "src",
      images[0].url
    );
    expect(within(dialog).getByText("Ảnh 1 · truoc.png")).toBeInTheDocument();
    expect(within(dialog).getByText("1/3")).toBeInTheDocument();
    // Dải thumbnail giữ đúng thứ tự ảnh đã lưu.
    images.forEach((image, index) =>
      expect(
        within(dialog)
          .getByRole("button", { name: `Xem ảnh ${index + 1}` })
          .querySelector("img")
      ).toHaveAttribute("src", image.url)
    );
    expect(dialog.querySelector("a[href]")).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Xem ảnh 3" }));
    expect(within(dialog).getByAltText("Ảnh 3 voucher LÔ-003")).toHaveAttribute(
      "src",
      images[2].url
    );
    expect(within(dialog).getByText("Ảnh 3 · phu-luc.png")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Ảnh sau" }));
    expect(within(dialog).getByText("Ảnh 1 · truoc.png")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Xem ảnh 2" }));
    fireEvent.click(within(dialog).getByAltText("Ảnh 2 voucher LÔ-003"));
    await waitFor(() =>
      expect(
        document.querySelector(`.ant-image-preview-img[src='${images[1].url}']`)
      ).toBeInTheDocument()
    );
  });

  it("shows the usage history returned by the API", async () => {
    const usage: PaperVoucherUsage = {
      id: 1,
      transactionId: "HD-0001",
      batchId: 3,
      batchCode: "LÔ-003",
      quantity: 2,
      faceValue: 100000,
      appliedAmount: 180000,
      staffName: "Thu ngân A",
      createdAt: "2026-10-29T03:00:00.000Z",
      status: "applied",
      orderId: 10206500
    };
    await setupPaperVoucherServer({ usages: [usage] });
    renderPage();
    await screen.findByText("LÔ-003");

    fireEvent.click(within(await openRowMenu("LÔ-003")).getByText("Xem chi tiết"));
    const dialog = await findModalByTitle("Chi tiết lô LÔ-003");

    const orderLink = await within(dialog).findByRole("button", { name: "10206500" });
    expect(within(dialog).queryByText("HD-0001")).not.toBeInTheDocument();
    expect(within(dialog).getByText("Đã áp dụng")).toBeInTheDocument();
    expect(within(dialog).getByText("Thu ngân A")).toBeInTheDocument();

    fireEvent.click(orderLink);
    expect(await screen.findByTestId("order-detail-dialog")).toHaveTextContent("10206500");
  });

  it("shows cancelled, reversed and unknown usage statuses without breaking the history", async () => {
    const baseUsage: PaperVoucherUsage = {
      id: 1,
      transactionId: null,
      batchId: 3,
      batchCode: "LÔ-003",
      quantity: 1,
      faceValue: 100000,
      appliedAmount: 100000,
      staffName: "Thu ngân A",
      createdAt: "2026-10-29T03:00:00.000Z",
      status: "applied",
      orderId: 10206511
    };
    const usages: PaperVoucherUsage[] = [
      { ...baseUsage, id: 1, orderId: 10206511, status: "cancelled" },
      { ...baseUsage, id: 2, orderId: 10206512, status: "reversed" },
      // Trạng thái BE có thể thêm sau này: không được làm hỏng bảng.
      { ...baseUsage, id: 3, orderId: 10206513, status: "held" as PaperVoucherUsage["status"] }
    ];
    await setupPaperVoucherServer({ usages });
    renderPage();
    await screen.findByText("LÔ-003");

    fireEvent.click(within(await openRowMenu("LÔ-003")).getByText("Xem chi tiết"));
    const dialog = await findModalByTitle("Chi tiết lô LÔ-003");

    expect(await within(dialog).findByRole("button", { name: "10206511" })).toBeInTheDocument();
    expect(within(dialog).getByText("Đã hủy, không dùng lại")).toBeInTheDocument();
    expect(within(dialog).getByText("Đã trả lại lô")).toBeInTheDocument();
    expect(within(dialog).getByText("Không xác định (held)")).toBeInTheDocument();
    expect(within(dialog).queryByText("Chưa có lượt sử dụng")).not.toBeInTheDocument();
  });

  it("shows empty image and usage states in details", async () => {
    await setupPaperVoucherServer();
    renderPage();
    await screen.findByText("LÔ-001");

    fireEvent.click(within(await openRowMenu("LÔ-001")).getByText("Xem chi tiết"));
    const dialog = await findModalByTitle("Chi tiết lô LÔ-001");

    expect(within(dialog).getByText("Chưa có hình ảnh voucher")).toBeInTheDocument();
    expect(await within(dialog).findByText("Chưa có lượt sử dụng")).toBeInTheDocument();
  });

  it("shows the API failure instead of an empty list without the raw server text", async () => {
    await setupPaperVoucherServer();
    server.use(
      http.get(`${PAPER_VOUCHER_TEST_BASE}/batches`, () =>
        HttpResponse.json({ statusCode: 500, message: RAW_SQL_MESSAGE }, { status: 500 })
      ),
      http.get(`${PAPER_VOUCHER_TEST_BASE}/summary`, () =>
        HttpResponse.json({ statusCode: 500, message: RAW_SQL_MESSAGE }, { status: 500 })
      )
    );
    renderPage();

    expect(
      await screen.findByText(
        `Không tải được danh sách lô voucher. ${SERVER_ERROR_HINT}`,
        {},
        { timeout: 5000 }
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/StaffAuditLog/)).not.toBeInTheDocument();
    expect(screen.queryByText("Chưa có lô voucher giấy")).not.toBeInTheDocument();
    expect(screen.getByTestId("paper-voucher-stat-batches")).toHaveTextContent("0");
  });

  describe("write errors (QA01-F1)", () => {
    /** Ghi đè một endpoint ghi, đếm số lần FE gửi để chứng minh không tự gửi lại. */
    const failWrite = (
      method: "patch" | "delete",
      path: string,
      status: number,
      body: Record<string, unknown>
    ) => {
      const calls = { count: 0 };
      server.use(
        http[method](`${PAPER_VOUCHER_TEST_BASE}${path}`, () => {
          calls.count += 1;
          return HttpResponse.json(body, { status });
        })
      );
      return calls;
    };

    it("shows a friendly message for a 500 on delete, sends it once and keeps the batch", async () => {
      await setupPaperVoucherServer();
      const calls = failWrite("delete", "/batches/4", 500, { message: RAW_SQL_MESSAGE });
      renderPage();
      await screen.findByText("LÔ-004");

      fireEvent.click(within(await openRowMenu("LÔ-004")).getByText("Xóa lô"));
      fireEvent.click(getButtonByText(await findModalByTitle("Xác nhận xóa lô voucher"), "Xóa"));

      expect(
        await screen.findByText(`Xóa lô voucher thất bại. ${SERVER_ERROR_HINT}`, {}, slow)
      ).toBeInTheDocument();
      expect(screen.queryByText(/StaffAuditLog/)).not.toBeInTheDocument();
      expect(screen.getByText("LÔ-004")).toBeInTheDocument();
      expect(calls.count).toBe(1);
    });

    it("keeps the backend message of a 409 business error", async () => {
      await setupPaperVoucherServer();
      failWrite("delete", "/batches/4", 409, {
        statusCode: 409,
        code: "PAPER_VOUCHER_BATCH_IN_USE",
        message: "Lô đã có lượt sử dụng, không thể xóa"
      });
      renderPage();
      await screen.findByText("LÔ-004");

      fireEvent.click(within(await openRowMenu("LÔ-004")).getByText("Xóa lô"));
      fireEvent.click(getButtonByText(await findModalByTitle("Xác nhận xóa lô voucher"), "Xóa"));

      expect(
        await screen.findByText("Lô đã có lượt sử dụng, không thể xóa", {}, slow)
      ).toBeInTheDocument();
    });

    it("keeps the edit dialog open on a 500 and does not resend the update", async () => {
      await setupPaperVoucherServer();
      const calls = failWrite("patch", "/batches/3", 500, {
        statusCode: 500,
        code: "INTERNAL_SERVER_ERROR",
        message: "Hệ thống gặp lỗi khi xử lý yêu cầu."
      });
      renderPage();
      await screen.findByText("LÔ-003");

      fireEvent.click(within(await openRowMenu("LÔ-003")).getByText("Chỉnh sửa"));
      const dialog = await findModalByTitle("Chỉnh sửa lô voucher giấy");
      changeInput(dialog, "Tên lô", "Voucher giấy 100K - sửa");
      fireEvent.click(getButtonByText(dialog, "Lưu thay đổi"));

      expect(
        await screen.findByText(`Cập nhật lô voucher thất bại. ${SERVER_ERROR_HINT}`, {}, slow)
      ).toBeInTheDocument();
      expect(screen.getByText("Chỉnh sửa lô voucher giấy")).toBeInTheDocument();
      expect(calls.count).toBe(1);
    });
  });

  it("hides CRUD actions that are not granted", async () => {
    await setupPaperVoucherServer();
    renderPage({ view: false, create: false, update: false, delete: false });
    await screen.findByText("LÔ-001");

    expect(screen.queryByText("Tạo lô Voucher")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Thao tác lô/)).not.toBeInTheDocument();
  });

  it("only offers viewing when update permission is missing", async () => {
    await setupPaperVoucherServer();
    renderPage({ create: false, update: false, delete: false });
    await screen.findByText("LÔ-003");

    const menu = await openRowMenu("LÔ-003");
    expect(within(menu).getByText("Xem chi tiết")).toBeInTheDocument();
    expect(within(menu).queryByText("Chỉnh sửa")).not.toBeInTheDocument();
    expect(within(menu).queryByText("Khóa lô")).not.toBeInTheDocument();
  });

  it("does not load the list without the list permission", () => {
    // Không đăng ký handler: nếu trang gọi API, MSW báo unhandled request.
    renderPage({ list: false });

    expect(screen.getByText("Bạn không có quyền xem danh sách voucher giấy")).toBeInTheDocument();
    expect(screen.queryByText("LÔ-001")).not.toBeInTheDocument();
  });

  it("redirects to 403 without the access permission", () => {
    renderPage({ access: false });

    expect(screen.getByText("Trang 403")).toBeInTheDocument();
    expect(screen.queryByText("Tạo lô Voucher")).not.toBeInTheDocument();
  });
});
