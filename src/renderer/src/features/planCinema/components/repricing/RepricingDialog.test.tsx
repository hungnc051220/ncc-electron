// "Đối chiếu giá suất chiếu" (V3.2): chỉ đọc, "Giá đang lưu" vs "Giá theo cấu hình hiện tại", mặc định chỉ suất
// tương lai và chỉ suất chênh lệch, 3 ô tổng hợp lấy từ `summary` của backend (toàn bộ suất), không có nút/route
// áp dụng.
import { initApi } from "@renderer/api/client";
import { queryClient } from "@renderer/lib/queryClient";
import { usePermissionStore } from "@renderer/store/permission.store";
import { server } from "@renderer/test/msw/server";
import type { RepricingPreviewItem } from "@shared/types";
import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App, ConfigProvider } from "antd";
import dayjs from "dayjs";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import RepricingDialog from "./RepricingDialog";

const API = "http://repricing.test";
const DATE = "2026-11-24";

const RULES = {
  ruleVersion: "holiday-v3.2",
  schema: { holidayPriceMode: true, promotionExclusion: true, screeningPolicy: true },
  ready: true,
  enforcedPolicies: ["U22"]
};

const item = (overrides: Partial<RepricingPreviewItem> = {}): RepricingPreviewItem => ({
  planScreenId: 410046,
  planCinemaId: 12112,
  projectDate: DATE,
  projectTime: "19:00",
  roomId: 2104,
  roomName: "2",
  filmId: 1,
  filmName: "GATTO",
  versionCode: "2D",
  isPast: false,
  stored: {
    daypartId: 7,
    dayPartName: "Ngày thường - Từ 17h đến 23:00",
    priceOfPosition1: "",
    priceOfPosition2: "T:80000",
    priceOfPosition3: "V:85000",
    priceOfPosition4: ""
  },
  configured: {
    daypartId: 17,
    dayPartName: "Ngày lễ - Từ 17h đến trước 23:00",
    effectiveDateTypeId: 2,
    pricingReason: "HOLIDAY",
    priceOfPosition1: "",
    priceOfPosition2: "T:90000",
    priceOfPosition3: "V:95000",
    priceOfPosition4: "",
    pricingVersion: "cccccccccccccccc"
  },
  configuredError: null,
  priceSource: "MATCHES_STORED_LIST",
  differs: true,
  blockers: [],
  ...overrides
});

const SOLD = item({
  planScreenId: 410099,
  blockers: [{ code: "HAS_ORDER_ITEMS", message: "Suất đã có vé" }]
});
const SAME = item({
  planScreenId: 410047,
  differs: false,
  configured: { ...item().configured!, priceOfPosition2: "T:80000", priceOfPosition3: "V:85000" }
});
const MANUAL = item({ planScreenId: 410048, priceSource: "MANUAL" });
const PAST = item({
  planScreenId: 400001,
  projectDate: "2026-11-01",
  isPast: true,
  configured: null,
  differs: false
});

type PreviewBody = { fromDate?: string; toDate?: string; includePast?: boolean };

/** Backend V3.2: `summary` is computed over every returned screening, before any client-side filter. */
const setup = async (
  options: { items?: RepricingPreviewItem[]; summary?: Record<string, number> } = {}
) => {
  await initApi(API);
  const state = { previews: [] as PreviewBody[], writes: 0 };
  server.use(
    http.get(`${API}/api/pos/pricing/rules/current`, () => HttpResponse.json(RULES)),
    http.post(`${API}/api/pos/plan-screenings/repricing/preview`, async ({ request }) => {
      const body = (await request.json()) as PreviewBody;
      state.previews.push(body);
      const items =
        options.items ?? (body.includePast ? [item(), SOLD, SAME, PAST] : [item(), SOLD, SAME]);
      return HttpResponse.json({
        generatedAt: "2026-11-11T08:00:00.000Z",
        includePast: Boolean(body.includePast),
        total: items.length,
        summary: options.summary ?? {
          total: items.length,
          matching: items.filter((row) => !row.isPast && row.configured && !row.differs).length,
          differing: items.filter((row) => row.differs).length,
          unavailable: items.filter((row) => !row.isPast && !row.configured).length,
          past: items.filter((row) => row.isPast).length
        },
        items
      });
    }),
    http.post(`${API}/api/pos/plan-screenings/:id/reprice`, () => {
      state.writes += 1;
      return new HttpResponse(null, { status: 404 });
    })
  );
  return state;
};

const renderDialog = (
  props: { date?: dayjs.Dayjs; initialDate?: dayjs.Dayjs } = { initialDate: dayjs(DATE) }
) => {
  usePermissionStore.setState({
    assignments: [
      {
        permissionKey: "plan_cinema",
        actions: { access: true, list: true, view: true, update: true }
      }
    ]
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ token: { motion: false } }}>
        <App>
          <RepricingDialog open {...props} onClose={() => undefined} />
        </App>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

const tileValue = (label: string) => {
  const summary = screen.getByTestId("repricing-summary");
  return within(summary).getByText(label).parentElement?.lastElementChild?.textContent;
};

describe("RepricingDialog (Đối chiếu giá suất chiếu)", { timeout: 30000 }, () => {
  beforeEach(() => queryClient.clear());

  it("read only: future screenings by default, stored vs configured price, differing rows only, no apply", async () => {
    const state = await setup();
    renderDialog();

    expect(await screen.findByText("#410046", undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(state.previews).toEqual([{ fromDate: DATE, toDate: DATE, includePast: false }]);
    expect(
      screen.getByText("So sánh giá đã lưu với cấu hình giá hiện tại. Không thay đổi dữ liệu.")
    ).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Giá đang lưu" })).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Giá theo cấu hình hiện tại" })
    ).toBeInTheDocument();
    // Hai suất chênh lệch: giá đang lưu 80.000, giá theo cấu hình 90.000; suất khớp bị ẩn mặc định.
    expect(screen.getAllByText("T 80,000")).toHaveLength(2);
    expect(screen.getAllByText("T 90,000")).toHaveLength(2);
    expect(screen.getAllByText("T: +10,000")).toHaveLength(2);
    expect(screen.queryByText("#410047")).not.toBeInTheDocument();
    expect(screen.getAllByText("Có chênh lệch").length).toBeGreaterThanOrEqual(2);
    expect(
      screen.queryByRole("button", { name: /Áp dụng|Cập nhật giá|Điều chỉnh/ })
    ).not.toBeInTheDocument();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(state.writes).toBe(0);

    fireEvent.click(screen.getByRole("switch", { name: "Xem tất cả suất" }));
    expect(await screen.findByText("#410047")).toBeInTheDocument();
    expect(screen.getByText("Khớp")).toBeInTheDocument();
    expect(state.writes).toBe(0);
  });

  it("the three tiles show the backend summary of every screening, not the filtered list", async () => {
    // 1 visible differing row, but the backend checked 5 screenings: 3 matching, 1 differing, 1 unavailable.
    await setup({
      items: [item(), SAME],
      summary: { total: 5, matching: 3, differing: 1, unavailable: 1, past: 0 }
    });
    renderDialog();

    await screen.findByText("#410046", undefined, { timeout: 5000 });
    expect(screen.queryByText("#410047")).not.toBeInTheDocument();
    expect(tileValue("Tổng suất chiếu")).toBe("5");
    expect(tileValue("Giá trùng khớp")).toBe("3");
    expect(tileValue("Có chênh lệch")).toBe("1");
    expect(screen.getByText(/1 suất không tính được giá theo cấu hình/)).toBeInTheDocument();
  });

  it("a manual or Đồng giá price is shown with its source (chosen by the planner), not as an error", async () => {
    await setup({ items: [MANUAL] });
    renderDialog();

    await screen.findByText("#410048", undefined, { timeout: 5000 });
    expect(screen.getByText(/Nguồn giá: Giá nhập tay \(do người/)).toBeInTheDocument();
  });

  it("past screenings only on request, as history without a configured price", async () => {
    const state = await setup();
    renderDialog();

    await screen.findByText("#410046", undefined, { timeout: 5000 });
    expect(screen.queryByText("#400001")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: /Bao gồm suất đã qua/ }));
    await waitFor(() => expect(state.previews.at(-1)).toMatchObject({ includePast: true }));
    fireEvent.click(await screen.findByRole("switch", { name: "Xem tất cả suất" }));

    expect(await screen.findByText("#400001")).toBeInTheDocument();
    const pastRow = screen.getByText("#400001").closest("tr") as HTMLElement;
    expect(pastRow).toHaveTextContent("Chỉ tra cứu");
    expect(pastRow).toHaveTextContent("Đã bắt đầu");
    expect(pastRow).not.toHaveTextContent("T 90,000");
    expect(state.writes).toBe(0);
  });

  it("one day (from Danh sách ngày): no date range and no past switch, future screenings of that day only", async () => {
    const state = await setup();
    renderDialog({ date: dayjs(DATE) });

    await screen.findByText("#410046", undefined, { timeout: 5000 });
    expect(screen.getByText(/24\/11\/2026 — Thứ 3/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Khoảng ngày chiếu")).not.toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: /Bao gồm suất đã qua/ })).not.toBeInTheDocument();
    expect(state.previews).toEqual([{ fromDate: DATE, toDate: DATE, includePast: false }]);
  });

  it("empty states: every screening matches / no screening on the day", async () => {
    await setup({ items: [SAME] });
    const first = renderDialog({ date: dayjs(DATE) });
    expect(
      await screen.findByText("Tất cả suất chiếu đều khớp với cấu hình giá hiện tại.", undefined, {
        timeout: 5000
      })
    ).toBeInTheDocument();
    first.unmount();
    queryClient.clear();

    await setup({ items: [] });
    renderDialog({ date: dayjs(DATE) });
    expect(
      await screen.findByText("Ngày này chưa có suất chiếu.", undefined, { timeout: 5000 })
    ).toBeInTheDocument();
  });

  it("old backend (rules 404): not supported, nothing is requested", async () => {
    await initApi(API);
    let previewCalls = 0;
    server.use(
      http.post(`${API}/api/pos/plan-screenings/repricing/preview`, () => {
        previewCalls += 1;
        return HttpResponse.json({ generatedAt: "", includePast: false, total: 0, items: [] });
      })
    );
    renderDialog();

    expect(
      await screen.findByText("Máy chủ chưa hỗ trợ đối chiếu giá suất chiếu.", undefined, {
        timeout: 5000
      })
    ).toBeInTheDocument();
    expect(previewCalls).toBe(0);
  });
});
