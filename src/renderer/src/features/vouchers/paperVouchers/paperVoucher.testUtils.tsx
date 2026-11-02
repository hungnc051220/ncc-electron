import { queryClient } from "@renderer/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, screen, within } from "@testing-library/react";
import { App, ConfigProvider } from "antd";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";

/**
 * Provider dùng cho test UI Voucher giấy. Tắt animation antd: trong jsdom không có
 * `transitionend`, Modal/Dropdown/Popconfirm phải chờ hết thời gian motion mỗi lần mở/đóng.
 */
export const PaperVoucherTestProviders = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <ConfigProvider theme={{ token: { motion: false } }}>
      <App>
        <MemoryRouter initialEntries={["/vouchers"]}>{children}</MemoryRouter>
      </App>
    </ConfigProvider>
  </QueryClientProvider>
);

/** jsdom không có object URL; tạo URL giả duy nhất và ghi nhận revoke. */
export const stubObjectUrls = () => {
  let sequence = 0;
  const createObjectURL = vi.fn(() => `blob:paper-voucher/${++sequence}`);
  const revokeObjectURL = vi.fn();

  Object.assign(URL, { createObjectURL, revokeObjectURL });

  return { createObjectURL, revokeObjectURL };
};

export const createImageFile = (name = "mat-truoc.png", type = "image/png", size = 1024): File => {
  const file = new File(["voucher"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

/*
 * Query nhẹ thay cho `*ByRole`: ByRole tính accessibility tree và `getComputedStyle` trên toàn bộ
 * DOM bảng/modal antd, rất chậm trong jsdom khi chạy song song nhiều file test.
 */
export const getButtonByText = (container: HTMLElement, text: string | RegExp) => {
  const button = within(container).getByText(text).closest("button");
  if (!button) throw new Error(`Không tìm thấy nút ${String(text)}`);
  return button;
};

export const findModalByTitle = async (title: string | RegExp) => {
  const titles = await screen.findAllByText(title, {
    selector: ".ant-modal-title, .ant-modal-confirm-title"
  });
  const modal = titles[titles.length - 1].closest<HTMLElement>(".ant-modal");
  if (!modal) throw new Error(`Không tìm thấy modal ${String(title)}`);
  return modal;
};

const openPaperVoucherFilter = () => {
  // Tiêu đề modal cũng là "Bộ lọc" nên tìm nút theo aria-label.
  const button = document.querySelector<HTMLButtonElement>('button[aria-label^="Bộ lọc"]');
  if (!button) throw new Error("Không tìm thấy nút Bộ lọc");
  fireEvent.click(button);
};

/** Mở popup "Bộ lọc", nhập từ khóa rồi bấm "Tìm kiếm". */
export const searchPaperVoucherKeyword = async (keyword: string) => {
  openPaperVoucherFilter();
  const modal = await findModalByTitle("Bộ lọc");
  fireEvent.change(within(modal).getByPlaceholderText("Tìm theo mã hoặc tên lô"), {
    target: { value: keyword }
  });
  fireEvent.click(getButtonByText(modal, "Tìm kiếm"));
};

/** Mở popup "Bộ lọc" rồi bấm "Xóa bộ lọc". */
export const clearPaperVoucherFilters = async () => {
  openPaperVoucherFilter();
  const modal = await findModalByTitle("Bộ lọc");
  fireEvent.click(getButtonByText(modal, "Xóa bộ lọc"));
};

/** Chọn một hoặc nhiều file (một lần chọn) qua input của antd Upload trong vùng chứa. */
export const selectImageFile = (container: HTMLElement, ...files: File[]) => {
  const input = container.querySelector<HTMLInputElement>("input[type='file']");
  if (!input) throw new Error("Không tìm thấy input chọn ảnh");
  fireEvent.change(input, { target: { files } });
};
