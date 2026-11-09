import { queryClient } from "@renderer/lib/queryClient";
import { usePermissionStore } from "@renderer/store/permission.store";
import { server } from "@renderer/test/msw/server";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import TicketPricesPage from "./TicketPricesPage";
import { setupU22Server, U22_TEST_API, U22TestProviders } from "./u22Price.testUtils";

const TICKET_PRICE_ROW = {
  id: 11,
  versionCode: "2D",
  daypartId: 1,
  positionId: 1,
  price: 75000,
  deleted: false,
  createdOnUtc: "2026-01-01T00:00:00.000Z",
  createdUser: "admin",
  updatedOnUtc: "2026-01-01T00:00:00.000Z",
  updatedUser: "admin",
  daypart: { id: 1, name: "Ngày thường - Từ 12h" },
  position: { id: 1, name: "Ghế thường" }
};

const renderPage = (
  actions: Record<string, boolean> = { access: true, list: true, create: true, update: true }
) => {
  usePermissionStore.setState({ assignments: [{ permissionKey: "ticket_prices", actions }] });
  server.use(
    http.get(`${U22_TEST_API}/api/pos/pricing`, () =>
      HttpResponse.json({ data: [TICKET_PRICE_ROW], total: 1, current: 1, pageSize: 20 })
    )
  );
  return render(
    <U22TestProviders>
      <TicketPricesPage />
    </U22TestProviders>
  );
};

const openU22Tab = () => fireEvent.click(screen.getByRole("tab", { name: "Giá vé U22" }));

// Dialog/bảng antd: khi chạy song song toàn bộ test có thể chậm hơn mặc định 5 s (như test voucher giấy).
describe("TicketPricesPage", { timeout: 30000 }, () => {
  beforeEach(() => queryClient.clear());

  it("keeps the Giá vé tab as before and does not read the U22 configuration", async () => {
    const state = await setupU22Server();
    renderPage();

    expect(await screen.findByText("Ghế thường")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Thêm giá vé/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Chỉnh sửa giá/ })).not.toBeInTheDocument();
    expect(state.getCount).toBe(0);
  });

  it("shows the two U22 groups, the 7 days and the last update on the Giá vé U22 tab", async () => {
    await setupU22Server();
    renderPage();

    openU22Tab();

    expect(await screen.findByTestId("u22-group-weekday")).toHaveTextContent("55.000đ");
    expect(screen.getByTestId("u22-group-weekend")).toHaveTextContent("70.000đ");
    expect(screen.getByTestId("u22-day-priceSat")).toHaveTextContent("70.000đ");
    expect(screen.getByTestId("u22-last-update")).toHaveTextContent("migration · 08/11/2026 09:00");
    expect(screen.getByRole("link", { name: "Mở Danh sách ngày" })).toHaveAttribute(
      "href",
      "/holidays"
    );
    expect(screen.queryByRole("button", { name: /Thêm giá vé/ })).not.toBeInTheDocument();
  });

  it("shows Giá riêng từng thứ for a group with weekday-specific prices", async () => {
    await setupU22Server({
      config: {
        priceMon: 55000,
        priceTue: 55000,
        priceWed: 55000,
        priceThu: 55000,
        priceFri: 80000,
        priceSat: 90000,
        priceSun: 90000,
        version: 3,
        updatedUser: "admin",
        updatedOnUtc: "2026-11-08T03:15:00.000Z"
      }
    });
    renderPage();

    openU22Tab();

    expect(await screen.findByTestId("u22-group-weekend")).toHaveTextContent("Giá riêng từng thứ");
    expect(screen.getByTestId("u22-day-priceFri")).toHaveTextContent("80.000đ");
  });

  it("edits through the real API flow: the tab shows the saved prices and version", async () => {
    const state = await setupU22Server();
    renderPage();
    openU22Tab();

    fireEvent.click(await screen.findByRole("button", { name: /Chỉnh sửa giá/ }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Giá Thứ 2 – Thứ 5"), {
      target: { value: "60000" }
    });
    fireEvent.change(within(dialog).getByLabelText("Giá Thứ 6 – Chủ nhật"), {
      target: { value: "90000" }
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /Lưu giá/ }));

    await waitFor(() =>
      expect(screen.getByTestId("u22-group-weekday")).toHaveTextContent("60.000đ")
    );
    expect(screen.getByTestId("u22-group-weekend")).toHaveTextContent("90.000đ");
    expect(state.config.version).toBe(2);
    expect(state.putBodies[0]).toMatchObject({ priceMon: 60000, priceSun: 90000, version: 1 });
  });

  it("hides Chỉnh sửa giá without ticket_prices.update", async () => {
    await setupU22Server();
    renderPage({ access: true, list: true, update: false });

    openU22Tab();

    expect(await screen.findByTestId("u22-group-weekday")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Chỉnh sửa giá/ })).not.toBeInTheDocument();
  });

  it("503: shows the configuration error with Thử lại, hides Chỉnh sửa giá, never falls back to 55.000đ", async () => {
    const state = await setupU22Server({
      getError: {
        status: 503,
        body: {
          statusCode: 503,
          code: "U22_PRICE_CONFIG_UNAVAILABLE",
          message: "Chưa đọc được cấu hình giá vé U22. Liên hệ quản trị viên."
        }
      }
    });
    renderPage();

    openU22Tab();

    expect(await screen.findByText("Không đọc được cấu hình giá vé U22")).toBeInTheDocument();
    expect(screen.queryByText("55.000đ")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Chỉnh sửa giá/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(state.getCount).toBe(2));
  });
});
