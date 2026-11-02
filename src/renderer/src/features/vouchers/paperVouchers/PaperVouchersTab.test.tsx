import type { PaperVoucherBatch } from "@shared/types";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { paperVoucherMockRepository } from "./paperVoucher.mock";
import {
  clearPaperVoucherFilters,
  createImageFile,
  findModalByTitle,
  getButtonByText,
  PaperVoucherTestProviders,
  searchPaperVoucherKeyword,
  stubObjectUrls
} from "./paperVoucher.testUtils";
import type { PaperVoucherPermissions } from "./paperVoucherPermissions";
import PaperVouchersTab from "./PaperVouchersTab";

// Cố định ngày nghiệp vụ VN để trạng thái seed ổn định (không fake Date vì ảnh hưởng timer của antd).
vi.mock("./paperVoucher.utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./paperVoucher.utils")>()),
  getVietnamBusinessDate: () => "2026-10-30"
}));

const FULL_ACCESS: PaperVoucherPermissions = {
  access: true,
  list: true,
  view: true,
  create: true,
  update: true,
  delete: true
};

/** Hiển thị nút thao tác mà tab đẩy lên thanh tab, giống `VouchersPage`. */
const TabHarness = ({ permissions }: { permissions: PaperVoucherPermissions }) => {
  const [actions, setActions] = useState<ReactNode>(null);

  return (
    <>
      <div>{actions}</div>
      <PaperVouchersTab permissions={permissions} onActionsChange={setActions} />
    </>
  );
};

const renderTab = (permissions: Partial<PaperVoucherPermissions> = FULL_ACCESS) =>
  render(
    <PaperVoucherTestProviders>
      <TabHarness permissions={{ ...FULL_ACCESS, ...permissions }} />
    </PaperVoucherTestProviders>
  );

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

const setImages = async (id: number, fileNames: string[]): Promise<PaperVoucherBatch> => {
  const batch = (await paperVoucherMockRepository.list()).find((item) => item.id === id);
  if (!batch) throw new Error(`Không tìm thấy lô ${id}`);

  return paperVoucherMockRepository.update({
    id,
    dto: {
      name: batch.name,
      faceValue: batch.faceValue,
      totalQuantity: batch.totalQuantity,
      validFrom: batch.validFrom,
      expiresAt: batch.expiresAt,
      note: batch.note,
      images: fileNames.map((fileName) => ({ file: createImageFile(fileName) }))
    }
  });
};

// Bảng antd trong jsdom render chậm; mỗi luồng gồm nhiều lần tải lại trang, thống kê và bộ lọc.
describe("PaperVouchersTab", { timeout: 20_000 }, () => {
  beforeEach(() => {
    paperVoucherMockRepository.reset();
    stubObjectUrls();
  });

  it("renders summary cards, computed statuses and the mock data label", async () => {
    renderTab();

    expect(await screen.findByText("LÔ-001")).toBeInTheDocument();
    expect(screen.getByText("Dữ liệu mẫu")).toBeInTheDocument();
    expect(screen.getByTestId("paper-voucher-stat-batches")).toHaveTextContent("4");
    expect(screen.getByTestId("paper-voucher-stat-issued")).toHaveTextContent("1,100");
    expect(screen.getByTestId("paper-voucher-stat-used")).toHaveTextContent("654");
    expect(screen.getByTestId("paper-voucher-stat-remaining")).toHaveTextContent("446");
    expect(within(getRow("LÔ-001")).getByText("Hết hạn")).toBeInTheDocument();
    expect(within(getRow("LÔ-002")).getByText("Hết hạn")).toBeInTheDocument();
    expect(within(getRow("LÔ-003")).getByText("Đang áp dụng")).toBeInTheDocument();
  });

  it("groups validity dates under one Hạn sử dụng header", async () => {
    renderTab();
    await screen.findByText("LÔ-001");

    expect(getHeaderCell("Hạn sử dụng")).toHaveAttribute("colspan", "2");
    expect(getHeaderCell("Từ ngày")).toBeInTheDocument();
    expect(getHeaderCell("Đến ngày")).toBeInTheDocument();

    expect(within(getRow("LÔ-001")).getByText("01/01/2025")).toBeInTheDocument();
    expect(within(getRow("LÔ-001")).getByText("31/12/2025")).toBeInTheDocument();
    expect(within(getRow("LÔ-002")).getByText("--")).toBeInTheDocument();
  });

  it("sorts by Từ ngày and Đến ngày using real dates", async () => {
    renderTab();
    await screen.findByText("LÔ-001");

    // Mặc định như API: lô mới nhất trước; khi bằng nhau luôn xếp thêm theo `id.desc`.
    expect(getBatchCodesInOrder()).toEqual(["LÔ-004", "LÔ-003", "LÔ-002", "LÔ-001"]);

    fireEvent.click(getHeaderCell("Từ ngày"));
    await waitFor(() =>
      expect(getBatchCodesInOrder()).toEqual(["LÔ-002", "LÔ-001", "LÔ-004", "LÔ-003"])
    );

    // Bấm hai lần = giảm dần theo HSD (lô cùng HSD vẫn xếp theo `id.desc`).
    fireEvent.click(getHeaderCell("Đến ngày"));
    fireEvent.click(getHeaderCell("Đến ngày"));
    await waitFor(() =>
      expect(getBatchCodesInOrder()).toEqual(["LÔ-004", "LÔ-003", "LÔ-002", "LÔ-001"])
    );
    expect(getHeaderCell("Đến ngày")).toHaveAttribute("aria-sort", "descending");
  });

  it("supports batches without an expiry date", async () => {
    const batch = (await paperVoucherMockRepository.list()).find((item) => item.id === 4);
    if (!batch) throw new Error("Không tìm thấy lô 4");
    await paperVoucherMockRepository.update({
      id: 4,
      dto: {
        name: batch.name,
        faceValue: batch.faceValue,
        totalQuantity: batch.totalQuantity,
        validFrom: batch.validFrom,
        expiresAt: null
      }
    });
    renderTab();
    await screen.findByText("LÔ-004");

    expect(within(getRow("LÔ-004")).getByText("Không thời hạn")).toBeInTheDocument();
    expect(within(getRow("LÔ-004")).getByText("Đang áp dụng")).toBeInTheDocument();

    fireEvent.click(getHeaderCell("Đến ngày"));
    await waitFor(() =>
      expect(getBatchCodesInOrder()).toEqual(["LÔ-002", "LÔ-001", "LÔ-003", "LÔ-004"])
    );
    fireEvent.click(getHeaderCell("Đến ngày"));
    await waitFor(() => expect(getBatchCodesInOrder()[0]).toBe("LÔ-004"));
  });

  it("searches by batch code from the filter popup, shows empty state and clears filters", async () => {
    renderTab();
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
    const single = await setImages(4, ["mot.png"]);
    const several = await setImages(3, ["dau.png", "hai.png", "ba.png"]);
    renderTab();
    await screen.findByText("LÔ-001");

    expect(within(getRow("LÔ-001")).getByLabelText("Lô LÔ-001 chưa có ảnh")).toBeInTheDocument();
    expect(within(getRow("LÔ-004")).getByAltText("Ảnh voucher LÔ-004")).toHaveAttribute(
      "src",
      single.images?.[0].url
    );

    const thumbnail = within(getRow("LÔ-003")).getByAltText("Ảnh voucher LÔ-003");
    expect(thumbnail).toHaveAttribute("src", several.images?.[0].url);

    fireEvent.click(thumbnail);
    await waitFor(() =>
      expect(
        document.querySelector(`.ant-image-preview-img[src='${several.images?.[0].url}']`)
      ).toBeInTheDocument()
    );
  });

  it("validates and creates a new batch in the demo state", async () => {
    renderTab();
    await screen.findByText("LÔ-001");

    fireEvent.click(getButtonByText(document.body, "Tạo lô Voucher"));
    const dialog = await findModalByTitle("Tạo lô voucher giấy");

    fireEvent.click(getButtonByText(dialog, "Tạo lô"));
    expect(await within(dialog).findByText("Nhập tên lô")).toBeInTheDocument();
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

    expect(await screen.findByText("LÔ-005")).toBeInTheDocument();
    expect(await screen.findByText(/Đã tạo lô voucher trên dữ liệu mẫu/)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId("paper-voucher-stat-issued")).toHaveTextContent("1,150")
    );
  });

  it("locks history fields when editing a used batch and keeps its image", async () => {
    const original = await setImages(3, ["truoc.png"]);
    renderTab();
    await screen.findByText("LÔ-003");

    fireEvent.click(within(await openRowMenu("LÔ-003")).getByText("Chỉnh sửa"));
    const dialog = await findModalByTitle("Chỉnh sửa lô voucher giấy");

    expect(within(dialog).getByText(/Lô đã ghi nhận 86 lượt sử dụng/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Mệnh giá (VNĐ)")).toBeDisabled();
    expect(within(dialog).getByLabelText("Ngày hết hạn")).toBeDisabled();

    changeInput(dialog, "Số lượng phát hành", "50");
    fireEvent.click(getButtonByText(dialog, "Lưu thay đổi"));
    expect(
      await within(dialog).findByText("Không được nhỏ hơn số đã sử dụng (86)")
    ).toBeInTheDocument();

    changeInput(dialog, "Tên lô", "Voucher giấy 100K - bổ sung");
    changeInput(dialog, "Số lượng phát hành", "250");
    fireEvent.click(getButtonByText(dialog, "Lưu thay đổi"));

    expect(await screen.findByText("Voucher giấy 100K - bổ sung")).toBeInTheDocument();
    expect(within(getRow("LÔ-003")).getByAltText("Ảnh voucher LÔ-003")).toHaveAttribute(
      "src",
      original.images?.[0].url
    );
  });

  it("locks a batch after confirmation without losing usage", async () => {
    renderTab();
    await screen.findByText("LÔ-003");

    fireEvent.click(within(await openRowMenu("LÔ-003")).getByText("Khóa lô"));
    fireEvent.click(getButtonByText(await findModalByTitle("Xác nhận khóa lô voucher"), "Khóa lô"));

    await waitFor(() => expect(within(getRow("LÔ-003")).getByText("Đã khóa")).toBeInTheDocument());
    expect(within(getRow("LÔ-003")).getByText("86")).toBeInTheDocument();
  });

  it("unlocks a locked batch after confirmation", async () => {
    await paperVoucherMockRepository.setLocked({ id: 3, isLocked: true });
    renderTab();
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
    renderTab();
    await screen.findByText("LÔ-003");

    const usedMenu = await openRowMenu("LÔ-003");
    expect(
      within(usedMenu).getByText("Xóa lô (đã có lượt sử dụng)").closest("[role='menuitem']")
    ).toHaveAttribute("aria-disabled", "true");

    fireEvent.click(within(await openRowMenu("LÔ-004")).getByText("Xóa lô"));
    fireEvent.click(getButtonByText(await findModalByTitle("Xác nhận xóa lô voucher"), "Xóa"));

    await waitFor(() => expect(screen.queryByText("LÔ-004")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByTestId("paper-voucher-stat-batches")).toHaveTextContent("3")
    );
  });

  it("shows every image in its stored order in details and previews them", async () => {
    const batch = await setImages(3, ["truoc.png", "sau.png", "phu-luc.png"]);
    renderTab();
    await screen.findByText("LÔ-003");

    fireEvent.click(within(await openRowMenu("LÔ-003")).getByText("Xem chi tiết"));
    const dialog = await findModalByTitle("Chi tiết lô LÔ-003");

    const images = batch.images ?? [];
    images.forEach((image, index) =>
      expect(within(dialog).getByAltText(`Ảnh ${index + 1} voucher LÔ-003`)).toHaveAttribute(
        "src",
        image.url
      )
    );
    expect(within(dialog).getByText("Ảnh 3 · phu-luc.png")).toBeInTheDocument();
    expect(dialog.querySelector("a[href]")).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByAltText("Ảnh 2 voucher LÔ-003"));
    await waitFor(() =>
      expect(
        document.querySelector(`.ant-image-preview-img[src='${images[1].url}']`)
      ).toBeInTheDocument()
    );
  });

  it("reflects simulated POS usage in statistics and batch history", async () => {
    await paperVoucherMockRepository.simulateRedemption({
      transactionId: "MOCK-VG-TEST",
      lines: [{ batchId: 3, quantity: 2, faceValue: 100000 }],
      ticketCount: 2,
      eligibleAmount: 180000,
      staffName: "Thu ngân A"
    });
    renderTab();
    await screen.findByText("LÔ-003");

    expect(within(getRow("LÔ-003")).getByText("88")).toBeInTheDocument();
    expect(screen.getByTestId("paper-voucher-stat-used")).toHaveTextContent("656");

    fireEvent.click(within(await openRowMenu("LÔ-003")).getByText("Xem chi tiết"));
    const dialog = await findModalByTitle("Chi tiết lô LÔ-003");

    expect(await within(dialog).findByText("MOCK-VG-TEST")).toBeInTheDocument();
    expect(within(dialog).getByText("Mô phỏng")).toBeInTheDocument();
    expect(within(dialog).getByText("Thu ngân A")).toBeInTheDocument();
  });

  it("shows an empty image state in details when no image was uploaded", async () => {
    renderTab();
    await screen.findByText("LÔ-001");

    fireEvent.click(within(await openRowMenu("LÔ-001")).getByText("Xem chi tiết"));
    const dialog = await findModalByTitle("Chi tiết lô LÔ-001");

    expect(within(dialog).getByText("Chưa có hình ảnh voucher")).toBeInTheDocument();
  });

  it("hides CRUD actions that are not granted", async () => {
    renderTab({ view: false, create: false, update: false, delete: false });
    await screen.findByText("LÔ-001");

    expect(screen.queryByText("Tạo lô Voucher")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Thao tác lô/)).not.toBeInTheDocument();
  });

  it("only offers viewing when update permission is missing", async () => {
    renderTab({ create: false, update: false, delete: false });
    await screen.findByText("LÔ-003");

    const menu = await openRowMenu("LÔ-003");
    expect(within(menu).getByText("Xem chi tiết")).toBeInTheDocument();
    expect(within(menu).queryByText("Chỉnh sửa")).not.toBeInTheDocument();
    expect(within(menu).queryByText("Khóa lô")).not.toBeInTheDocument();
  });

  it("does not load the list without the list permission", () => {
    renderTab({ list: false });

    expect(screen.getByText("Bạn không có quyền xem danh sách voucher giấy")).toBeInTheDocument();
    expect(screen.queryByText("LÔ-001")).not.toBeInTheDocument();
  });
});
