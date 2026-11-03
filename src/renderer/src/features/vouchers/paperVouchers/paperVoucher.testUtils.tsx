import { api, initApi } from "@renderer/api/client";
import { queryClient } from "@renderer/lib/queryClient";
import { server } from "@renderer/test/msw/server";
import type {
  PaperVoucherBatch,
  PaperVoucherBatchStatus,
  PaperVoucherImage,
  PaperVoucherUsage
} from "@shared/types";
import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, screen, within } from "@testing-library/react";
import { App, ConfigProvider } from "antd";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import {
  getPaperVoucherAmounts,
  getPaperVoucherStatus,
  normalizeSearchText,
  summarizePaperVoucherBatches
} from "./paperVoucher.utils";

export const PAPER_VOUCHER_TEST_API = "http://paper-voucher.test";
export const PAPER_VOUCHER_TEST_BASE = `${PAPER_VOUCHER_TEST_API}/api/pos/paper-vouchers`;

// Giữ bản gốc trước mọi spy: `setupPaperVoucherServer` có thể được gọi nhiều lần trong một test.
const originalPost = api.post.bind(api);

/** Lô dùng trong test. Với ngày nghiệp vụ 2026-10-30: LÔ-001/002 hết hạn, LÔ-003/004 đang áp dụng. */
export const PAPER_VOUCHER_FIXTURES: PaperVoucherBatch[] = [
  {
    id: 1,
    batchCode: "LÔ-001",
    name: "Voucher giấy 100.000đ - 2025",
    faceValue: 100000,
    totalQuantity: 500,
    usedCount: 468,
    validFrom: "2025-01-01",
    expiresAt: "2025-12-31",
    isLocked: false,
    note: "Phát hành cho đối tác doanh nghiệp năm 2025",
    createdAt: "2024-12-20T02:00:00.000Z",
    updatedAt: "2025-12-31T09:30:00.000Z"
  },
  {
    id: 2,
    batchCode: "LÔ-002",
    name: "Voucher giấy 50.000đ - 2025",
    faceValue: 50000,
    totalQuantity: 100,
    usedCount: 100,
    validFrom: null,
    expiresAt: "2025-12-31",
    isLocked: false,
    note: null,
    createdAt: "2025-03-05T03:15:00.000Z",
    updatedAt: "2025-11-18T07:45:00.000Z"
  },
  {
    id: 3,
    batchCode: "LÔ-003",
    name: "Voucher giấy 100.000đ - 2026",
    faceValue: 100000,
    totalQuantity: 200,
    usedCount: 86,
    validFrom: "2026-01-01",
    expiresAt: "2026-12-31",
    isLocked: false,
    note: null,
    createdAt: "2025-12-15T04:00:00.000Z",
    updatedAt: "2026-10-12T08:20:00.000Z"
  },
  {
    id: 4,
    batchCode: "LÔ-004",
    name: "Voucher giấy 95.000đ - 2026",
    faceValue: 95000,
    totalQuantity: 300,
    usedCount: 0,
    validFrom: "2026-01-01",
    expiresAt: "2026-12-31",
    isLocked: false,
    note: "Chưa phân phối",
    createdAt: "2025-12-15T04:10:00.000Z",
    updatedAt: "2025-12-15T04:10:00.000Z"
  }
];

export const createPaperVoucherImage = (fileName: string): PaperVoucherImage => ({
  url: `https://cdn.paper-voucher.test/${fileName}`,
  fileName
});

interface PaperVoucherServerOptions {
  batches?: PaperVoucherBatch[];
  usages?: PaperVoucherUsage[];
  /** Ngày nghiệp vụ backend dùng để tính trạng thái và `countByStatus`. */
  today?: string;
}

const pageOf = <T,>(data: T[], current: number, pageSize: number) => ({
  data: pageSize > 0 ? data.slice((current - 1) * pageSize, current * pageSize) : data,
  total: data.length,
  current,
  pageCount: pageSize > 0 ? Math.max(1, Math.ceil(data.length / pageSize)) : 1,
  pageSize
});

/**
 * Backend Voucher giấy giả lập qua MSW cho test UI: giữ state trong bộ nhớ của từng test,
 * danh sách luôn theo `id.desc`, chỉ lọc theo `keyword`. Sort/lọc khác kiểm tra qua `pageQueries`.
 */
export const setupPaperVoucherServer = async ({
  batches: initialBatches = PAPER_VOUCHER_FIXTURES,
  usages = [],
  today = "2026-10-30"
}: PaperVoucherServerOptions = {}) => {
  await initApi(PAPER_VOUCHER_TEST_API);

  let batches: PaperVoucherBatch[] = initialBatches.map((batch) => ({
    ...batch,
    images: batch.images ?? []
  }));
  const pageQueries: URLSearchParams[] = [];
  const requestBodies: { method: string; path: string; body: unknown }[] = [];

  const toResponse = (batch: PaperVoucherBatch): PaperVoucherBatch => ({
    ...batch,
    remainingQuantity: getPaperVoucherAmounts(batch).remainingQuantity,
    status: getPaperVoucherStatus(batch, today)
  });
  const findBatch = (id: unknown) => batches.find((batch) => batch.id === Number(id));
  const notFound = () =>
    HttpResponse.json({ statusCode: 404, message: "Không tìm thấy lô voucher" }, { status: 404 });
  const readBody = async (request: Request) => {
    const body = (await request.json()) as Record<string, unknown>;
    requestBodies.push({ method: request.method, path: new URL(request.url).pathname, body });
    return body;
  };

  // XHR của jsdom qua MSW không serialize được FormData, nên trả kết quả upload ảnh tại axios.
  vi.spyOn(api, "post").mockImplementation((url, data, config) => {
    if (!url.endsWith("/paper-vouchers/images")) return originalPost(url, data, config);
    const file = (data as FormData).get("file") as File;
    return Promise.resolve({ data: createPaperVoucherImage(file.name) });
  });

  server.use(
    http.get(`${PAPER_VOUCHER_TEST_BASE}/batches`, ({ request }) => {
      const params = new URL(request.url).searchParams;
      const pageSize = Number(params.get("pageSize") ?? 20);
      // pageSize=0 là request lấy toàn bộ lô cho bộ lọc/màn bán vé.
      if (pageSize !== 0) pageQueries.push(params);

      const keyword = normalizeSearchText(params.get("keyword"));
      const rows = batches
        .filter(
          (batch) =>
            !keyword ||
            normalizeSearchText(batch.batchCode).includes(keyword) ||
            normalizeSearchText(batch.name).includes(keyword)
        )
        .sort((left, right) => right.id - left.id)
        .map(toResponse);

      return HttpResponse.json(pageOf(rows, Number(params.get("current") ?? 1), pageSize));
    }),
    http.get(`${PAPER_VOUCHER_TEST_BASE}/summary`, () => {
      const countByStatus: Record<PaperVoucherBatchStatus, number> = {
        active: 0,
        upcoming: 0,
        expired: 0,
        locked: 0,
        depleted: 0
      };
      batches.forEach((batch) => (countByStatus[getPaperVoucherStatus(batch, today)] += 1));

      return HttpResponse.json({
        ...summarizePaperVoucherBatches(batches),
        countByStatus,
        businessDate: today
      });
    }),
    http.get(`${PAPER_VOUCHER_TEST_BASE}/batches/:id`, ({ params }) => {
      const batch = findBatch(params.id);
      return batch ? HttpResponse.json(toResponse(batch)) : notFound();
    }),
    http.get(`${PAPER_VOUCHER_TEST_BASE}/batches/:id/usages`, ({ params }) =>
      HttpResponse.json(
        pageOf(
          usages.filter((usage) => usage.batchId === Number(params.id)),
          1,
          0
        )
      )
    ),
    http.post(`${PAPER_VOUCHER_TEST_BASE}/batches`, async ({ request }) => {
      const body = await readBody(request);
      const id = Math.max(0, ...batches.map((batch) => batch.id)) + 1;
      const now = new Date().toISOString();
      const batch: PaperVoucherBatch = {
        name: "",
        faceValue: 0,
        totalQuantity: 0,
        validFrom: null,
        expiresAt: null,
        note: null,
        images: [],
        ...body,
        id,
        batchCode: `LÔ-${id.toString().padStart(3, "0")}`,
        usedCount: 0,
        isLocked: false,
        createdAt: now,
        updatedAt: now
      };
      batches = [...batches, batch];
      return HttpResponse.json(toResponse(batch), { status: 201 });
    }),
    http.patch(`${PAPER_VOUCHER_TEST_BASE}/batches/:id/lock`, async ({ params, request }) => {
      const body = await readBody(request);
      const batch = findBatch(params.id);
      if (!batch) return notFound();
      Object.assign(batch, { isLocked: Boolean(body.isLocked) });
      return HttpResponse.json(toResponse(batch));
    }),
    http.patch(`${PAPER_VOUCHER_TEST_BASE}/batches/:id`, async ({ params, request }) => {
      const body = await readBody(request);
      const batch = findBatch(params.id);
      if (!batch) return notFound();
      Object.assign(batch, body);
      return HttpResponse.json(toResponse(batch));
    }),
    http.delete(`${PAPER_VOUCHER_TEST_BASE}/batches/:id`, ({ params }) => {
      if (!findBatch(params.id)) return notFound();
      batches = batches.filter((batch) => batch.id !== Number(params.id));
      return new HttpResponse(null, { status: 204 });
    })
  );

  return {
    pageQueries,
    requestBodies,
    getBatch: (id: number) => findBatch(id)
  };
};

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
