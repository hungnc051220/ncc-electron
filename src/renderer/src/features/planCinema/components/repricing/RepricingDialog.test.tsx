// "Kiểm tra giá suất chiếu" (V3.2): chỉ đọc, "Giá đang lưu" vs "Giá theo cấu hình hiện tại", mặc định chỉ suất
// tương lai, suất đã qua chỉ tra cứu, không có nút/route áp dụng.
import { initApi } from "@renderer/api/client";
import { queryClient } from "@renderer/lib/queryClient";
import { usePermissionStore } from "@renderer/store/permission.store";
import { server } from "@renderer/test/msw/server";
import type { RepricingPreviewItem } from "@shared/types";
import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
const PAST = item({
  planScreenId: 400001,
  projectDate: "2026-11-01",
  isPast: true,
  configured: null,
  differs: false
});

const setup = async () => {
  await initApi(API);
  const state = { previews: [] as { includePast?: boolean }[], writes: 0 };
  server.use(
    http.get(`${API}/api/pos/pricing/rules`, () => HttpResponse.json(RULES)),
    http.post(`${API}/api/pos/plan-screenings/repricing/preview`, async ({ request }) => {
      const body = (await request.json()) as { includePast?: boolean };
      state.previews.push(body);
      const items = body.includePast ? [item(), SOLD, SAME, PAST] : [item(), SOLD, SAME];
      return HttpResponse.json({
        generatedAt: "2026-11-11T08:00:00.000Z",
        includePast: Boolean(body.includePast),
        total: items.length,
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

const renderDialog = () => {
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
          <RepricingDialog open initialDate={dayjs(DATE)} onClose={() => undefined} />
        </App>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

describe("RepricingDialog (Kiểm tra giá suất chiếu)", { timeout: 30000 }, () => {
  beforeEach(() => queryClient.clear());

  it("read only: future screenings by default, stored vs configured price, differences only, no apply", async () => {
    const state = await setup();
    renderDialog();

    expect(await screen.findByText("#410046", undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(state.previews).toEqual([{ fromDate: DATE, toDate: DATE, includePast: false }]);
    expect(screen.getByRole("columnheader", { name: "Giá đang lưu" })).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Giá theo cấu hình hiện tại" })
    ).toBeInTheDocument();
    // Hai suất khác cấu hình: giá đang lưu 80.000, giá theo cấu hình 90.000; suất khớp bị ẩn mặc định.
    expect(screen.getAllByText("T 80,000")).toHaveLength(2);
    expect(screen.getAllByText("T 90,000")).toHaveLength(2);
    expect(screen.queryByText("#410047")).not.toBeInTheDocument();
    expect(screen.getAllByText("Khác cấu hình hiện tại")).toHaveLength(2);
    expect(screen.getByText(/Đã có vé\/đơn/)).toBeInTheDocument();
    expect(screen.getByText(/Chức năng điều chỉnh giá suất đang tạm ngừng\./)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Áp dụng/ })).not.toBeInTheDocument();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(state.writes).toBe(0);

    fireEvent.click(screen.getByRole("switch", { name: /Chỉ hiện suất có giá khác/ }));
    expect(await screen.findByText("#410047")).toBeInTheDocument();
    expect(screen.getByText("Khớp cấu hình hiện tại")).toBeInTheDocument();
  });

  it("past screenings only on request, as history without a configured price", async () => {
    const state = await setup();
    renderDialog();

    await screen.findByText("#410046", undefined, { timeout: 5000 });
    expect(screen.queryByText("#400001")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: /Bao gồm suất đã qua/ }));

    expect(await screen.findByText("#400001")).toBeInTheDocument();
    await waitFor(() => expect(state.previews.at(-1)).toMatchObject({ includePast: true }));
    const pastRow = screen.getByText("#400001").closest("tr") as HTMLElement;
    expect(pastRow).toHaveTextContent("Chỉ tra cứu");
    expect(pastRow).toHaveTextContent("Suất đã qua — chỉ tra cứu");
    expect(pastRow).not.toHaveTextContent("T 90,000");
    expect(state.writes).toBe(0);
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
      await screen.findByText("Máy chủ chưa hỗ trợ kiểm tra giá suất chiếu.", undefined, {
        timeout: 5000
      })
    ).toBeInTheDocument();
    expect(previewCalls).toBe(0);
  });
});
