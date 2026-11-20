import { initApi } from "@renderer/api/client";
import { queryClient } from "@renderer/lib/queryClient";
import { useAuthStore } from "@renderer/store/auth.store";
import { usePermissionStore } from "@renderer/store/permission.store";
import { server } from "@renderer/test/msw/server";
import type { PermissionAction, SeatIconConfig } from "@shared/types";
import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App, ConfigProvider } from "antd";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import SeatIconConfigsPage from "./SeatIconConfigsPage";
import { SEAT_ICON_PERMISSION_KEY } from "./seatIconConfig.utils";

vi.mock("@renderer/socket/socket", () => ({
  connectSocket: vi.fn(),
  disconnectSocket: vi.fn()
}));

const API = "http://seat-icon-page.test";
const BASE = `${API}/api/pos/seat-icon-configs`;
const imageUrl = (name: string) =>
  `https://res.anvui.vn/demo/image/upload/v1/attachments_ncc/admin/seat-icons/${name}.png`;

const config = (overrides: Partial<SeatIconConfig>): SeatIconConfig => ({
  id: 1,
  targetType: "SOLD",
  scope: "GLOBAL",
  scopeId: null,
  scopeName: null,
  scopeTargetMissing: false,
  imageUrl: imageUrl("global"),
  isEnabled: true,
  version: 1,
  createdAt: "2026-11-20T03:15:00.000Z",
  createdBy: "admin",
  updatedAt: null,
  updatedBy: null,
  ...overrides
});

const FIXTURES: SeatIconConfig[] = [
  config({ id: 1 }),
  config({
    id: 2,
    scope: "ROOM",
    scopeId: 12,
    scopeName: "Phòng 1",
    imageUrl: imageUrl("room"),
    version: 4
  }),
  config({
    id: 3,
    scope: "FILM",
    scopeId: 98,
    scopeName: "Phim cũ",
    scopeTargetMissing: true,
    isEnabled: false
  })
];

type Requests = { method: string; url: URL; body?: unknown }[];

const FULL: PermissionAction[] = ["access", "list", "view", "create", "update", "delete"];

let requests: Requests;

const setupServer = (configs: SeatIconConfig[] = FIXTURES) => {
  server.use(
    http.get(BASE, ({ request }) => {
      const params = new URL(request.url).searchParams;
      const scope = params.get("scope");
      const data = configs.filter((item) => !scope || item.scope === scope);
      return HttpResponse.json({
        data,
        total: data.length,
        current: 1,
        pageSize: Number(params.get("pageSize") ?? 20),
        pageCount: 1
      });
    }),
    http.get(`${API}/api/pos/rooms`, () =>
      HttpResponse.json({
        data: [
          { id: 12, name: "Phòng 1" },
          { id: 13, name: "Phòng 2" }
        ],
        total: 2,
        current: 1,
        pageSize: 1000,
        pageCount: 1
      })
    )
  );
};

const renderPage = (actions: PermissionAction[] = FULL) => {
  usePermissionStore.setState({
    assignments: [
      {
        permissionKey: SEAT_ICON_PERMISSION_KEY,
        actions: Object.fromEntries(actions.map((action) => [action, true])) as Record<
          PermissionAction,
          boolean
        >
      }
    ]
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ token: { motion: false } }}>
        <App>
          <MemoryRouter initialEntries={["/seat-icon-configs"]}>
            <SeatIconConfigsPage />
          </MemoryRouter>
        </App>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

const listRequests = () =>
  requests.filter(
    (request) => request.method === "GET" && request.url.pathname === "/api/pos/seat-icon-configs"
  );

const openRowMenu = async (id: number) => {
  fireEvent.click(await screen.findByLabelText(`Thao tác cấu hình #${id}`));
  return waitFor(() => {
    const menus = document.querySelectorAll<HTMLElement>(
      ".ant-dropdown:not(.ant-dropdown-hidden) [role='menu']"
    );
    if (!menus.length) throw new Error("Menu thao tác chưa mở");
    return menus[menus.length - 1];
  });
};

const findModal = async (title: string | RegExp) => {
  const titles = await screen.findAllByText(title, {
    selector: ".ant-modal-title, .ant-modal-confirm-title"
  });
  return titles[titles.length - 1].closest<HTMLElement>(".ant-modal")!;
};

const clickButton = (container: HTMLElement, text: string | RegExp) =>
  fireEvent.click(within(container).getByText(text).closest("button")!);

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    }
  );
});

beforeEach(async () => {
  await initApi(API);
  useAuthStore.getState().login("staff-token", "staff-refresh", 12);
  requests = [];
  server.events.on("request:start", async ({ request }) => {
    const contentType = request.headers.get("content-type");
    const body = contentType?.includes("application/json")
      ? await request.clone().json()
      : undefined;
    requests.push({ method: request.method, url: new URL(request.url), body });
  });
  setupServer();
});

afterEach(() => {
  server.events.removeAllListeners();
});

/** Trang antd đầy đủ trong jsdom chậm trên máy POS/CI: cùng mức chờ với PaperVouchersPage.test. */
const slow = { timeout: 4000 };

describe("SeatIconConfigsPage", { timeout: 20_000 }, () => {
  it("lists configurations with scope, missing target and status", async () => {
    renderPage();

    expect(await screen.findByText("Phòng 1")).toBeInTheDocument();
    expect(screen.getByText("Mọi phòng, mọi phim")).toBeInTheDocument();
    expect(screen.getByText("Phim đã xóa")).toBeInTheDocument();
    expect(screen.getAllByText("Đang áp dụng").length).toBeGreaterThan(0);
    expect(screen.getByText("Đang tắt", { selector: ".ant-tag" })).toBeInTheDocument();
    expect(screen.getByText("Tổng 3 bản ghi")).toBeInTheDocument();
  });

  it("filters by scope on the server", async () => {
    renderPage();
    await screen.findByText("Phòng 1");

    fireEvent.click(screen.getByText("Phim", { selector: ".ant-segmented-item-label" }));

    await waitFor(() =>
      expect(
        listRequests().some((request) => request.url.searchParams.get("scope") === "FILM")
      ).toBe(true)
    );
    await waitFor(() => expect(screen.queryByText("Phòng 1")).not.toBeInTheDocument());
    expect(screen.getByText("Phim cũ")).toBeInTheDocument();
  });

  it("does not load the list without view/list permission", async () => {
    renderPage(["access", "create"]);

    expect(
      await screen.findByText("Bạn chưa được cấp quyền xem danh sách cấu hình icon ghế")
    ).toBeInTheDocument();
    expect(screen.queryByText("Thêm cấu hình")).not.toBeInTheDocument();
    expect(listRequests()).toHaveLength(0);
  });

  it("is read-only with only list permission", async () => {
    renderPage(["access", "list"]);

    expect(await screen.findByText("Phòng 1")).toBeInTheDocument();
    expect(screen.queryByText("Thêm cấu hình")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Thao tác cấu hình #2")).not.toBeInTheDocument();
  });

  it("shows only allowed row actions", async () => {
    renderPage(["access", "list", "delete"]);

    const menu = await openRowMenu(2);

    expect(within(menu).getByText("Xóa")).toBeInTheDocument();
    expect(within(menu).queryByText("Cập nhật")).not.toBeInTheDocument();
    expect(within(menu).queryByText("Tắt")).not.toBeInTheDocument();
  });

  it("shows an error state with retry when the list fails", async () => {
    server.use(
      http.get(BASE, () =>
        HttpResponse.json(
          {
            statusCode: 503,
            code: "SEAT_ICON_CONFIG_UNAVAILABLE",
            message: "Chưa đọc được cấu hình icon ghế. Liên hệ quản trị viên."
          },
          { status: 503 }
        )
      )
    );
    renderPage();

    expect(
      await screen.findByText("Chưa đọc được cấu hình icon ghế. Liên hệ quản trị viên.", {}, slow)
    ).toBeInTheDocument();
    expect(screen.getByText("Thử lại")).toBeInTheDocument();
  });

  it("shows the empty state with a create button", async () => {
    setupServer([]);
    renderPage();

    expect(
      await screen.findByText(/Chưa có cấu hình nào — sơ đồ ghế đang dùng giao diện mặc định/)
    ).toBeInTheDocument();
    expect(screen.getByText("Thêm cấu hình đầu tiên")).toBeInTheDocument();
  });

  it("turns a configuration off with PUT + the version that was read", async () => {
    server.use(
      http.put(`${BASE}/2`, () =>
        HttpResponse.json({ ...FIXTURES[1], isEnabled: false, version: 5 })
      )
    );
    renderPage();

    fireEvent.click(within(await openRowMenu(2)).getByText("Tắt"));
    const confirm = await findModal("Tắt cấu hình #2?");
    expect(confirm).toHaveTextContent('Phòng "Phòng 1" sẽ dùng cấu hình Toàn rạp (#1)');
    clickButton(confirm, "Tắt");

    await waitFor(() => expect(requests.some((request) => request.method === "PUT")).toBe(true));
    expect(requests.find((request) => request.method === "PUT")?.body).toEqual({
      targetType: "SOLD",
      scope: "ROOM",
      scopeId: 12,
      imageUrl: imageUrl("room"),
      isEnabled: false,
      version: 4
    });
    expect(await screen.findByText("Đã tắt cấu hình", {}, slow)).toBeInTheDocument();
  });

  it("tells the admin when someone else changed the configuration while toggling", async () => {
    server.use(
      http.put(`${BASE}/2`, () =>
        HttpResponse.json(
          {
            statusCode: 409,
            code: "SEAT_ICON_CONFIG_CHANGED",
            message: "Cấu hình đã được người khác thay đổi. Vui lòng tải lại và thử lại."
          },
          { status: 409 }
        )
      )
    );
    renderPage();

    fireEvent.click(within(await openRowMenu(2)).getByText("Tắt"));
    clickButton(await findModal("Tắt cấu hình #2?"), "Tắt");

    expect(
      await screen.findByText(
        "Cấu hình đã được người khác thay đổi. Vui lòng tải lại và thử lại.",
        {},
        slow
      )
    ).toBeInTheDocument();
  });

  it("deletes after confirmation explaining the fallback", async () => {
    server.use(http.delete(`${BASE}/3`, () => HttpResponse.json({ id: 3, deleted: true })));
    renderPage();

    fireEvent.click(within(await openRowMenu(3)).getByText("Xóa"));
    const confirm = await findModal("Xóa cấu hình icon ghế #3?");
    expect(confirm).toHaveTextContent("cấu hình Toàn rạp (#1)");
    clickButton(confirm, "Xóa");

    await waitFor(() =>
      expect(
        requests.some(
          (request) =>
            request.method === "DELETE" && request.url.pathname === "/api/pos/seat-icon-configs/3"
        )
      ).toBe(true)
    );
    expect(await screen.findByText("Đã xóa cấu hình", {}, slow)).toBeInTheDocument();
  });

  it("edits with the read version and handles a version conflict by loading the latest", async () => {
    let putCount = 0;
    const latest = { ...FIXTURES[1], version: 5, updatedBy: "nguoi-khac" };
    server.use(
      http.put(`${BASE}/2`, () => {
        putCount += 1;
        return putCount === 1
          ? HttpResponse.json(
              {
                statusCode: 409,
                code: "SEAT_ICON_CONFIG_CHANGED",
                message: "Cấu hình đã được người khác thay đổi. Vui lòng tải lại và thử lại.",
                details: { current: latest }
              },
              { status: 409 }
            )
          : HttpResponse.json({ ...latest, version: 6 });
      })
    );
    renderPage();

    fireEvent.click(within(await openRowMenu(2)).getByText("Cập nhật"));
    let dialog = await findModal("Sửa cấu hình icon ghế #2 · Phòng 1");
    clickButton(dialog, "Lưu thay đổi");

    expect(
      await within(dialog).findByText("Cấu hình đã được người khác cập nhật", {}, slow)
    ).toBeInTheDocument();
    expect(requests.filter((request) => request.method === "PUT")[0].body).toMatchObject({
      version: 4
    });

    clickButton(dialog, "Tải bản mới nhất");
    await waitFor(() =>
      expect(within(dialog).queryByText("Cấu hình đã được người khác cập nhật")).toBeNull()
    );
    dialog = await findModal("Sửa cấu hình icon ghế #2 · Phòng 1");
    clickButton(dialog, "Lưu thay đổi");

    expect(await screen.findByText("Đã lưu cấu hình icon ghế", {}, slow)).toBeInTheDocument();
    expect(requests.filter((request) => request.method === "PUT")[1].body).toMatchObject({
      version: 5
    });
  });

  it("shows the existing configuration on a duplicate scope and opens it", async () => {
    server.use(
      http.put(`${BASE}/2`, () =>
        HttpResponse.json(
          {
            statusCode: 409,
            code: "SEAT_ICON_CONFIG_DUPLICATE",
            message: "Phạm vi này đã có cấu hình icon ghế.",
            details: { existingId: 1 }
          },
          { status: 409 }
        )
      ),
      http.get(`${BASE}/1`, () => HttpResponse.json(FIXTURES[0]))
    );
    renderPage();

    fireEvent.click(within(await openRowMenu(2)).getByText("Cập nhật"));
    const dialog = await findModal("Sửa cấu hình icon ghế #2 · Phòng 1");
    clickButton(dialog, "Lưu thay đổi");

    expect(
      await within(dialog).findByText("Toàn rạp đã có cấu hình icon ghế (#1)", {}, slow)
    ).toBeInTheDocument();
    clickButton(dialog, "Mở cấu hình #1");

    expect(await findModal("Sửa cấu hình icon ghế #1 · Toàn rạp")).toBeInTheDocument();
  });
});
