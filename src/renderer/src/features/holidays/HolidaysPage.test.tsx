import { initApi } from "@renderer/api/client";
import { queryClient } from "@renderer/lib/queryClient";
import { usePermissionStore } from "@renderer/store/permission.store";
import { server } from "@renderer/test/msw/server";
import type { HolidayProps } from "@shared/types";
import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App, ConfigProvider } from "antd";
import dayjs from "dayjs";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { classifyDate, getTabAfterUnmark } from "./dateClassification";
import HolidaysPage from "./HolidaysPage";

const API = "http://date-management.test";
const YEAR = dayjs().year();

const day = (dateValue: string, extra: Partial<HolidayProps> = {}): HolidayProps => ({
  dateValue,
  dateTypeId: 1,
  createdOnUtc: "",
  createdUser: "system",
  CreatedOnUtc: "",
  isHoliday: false,
  holidayName: null,
  ...extra
});

/** Tuần đầu tháng 9 của năm hiện tại, 02/09 là ngày lễ. */
const buildDays = () => {
  const start = dayjs(`${YEAR}-09-01`);
  return Array.from({ length: 7 }, (_, index) => {
    const dateValue = start.add(index, "day").format("YYYY-MM-DD");
    return dateValue === `${YEAR}-09-02`
      ? day(dateValue, { isHoliday: true, holidayName: "Quốc khánh", dateTypeId: 2 })
      : day(dateValue);
  });
};

const setupServer = async (
  initialDays: HolidayProps[] = buildDays(),
  screeningDates: string[] = []
) => {
  await initApi(API);
  const state = { days: initialDays.map((item) => ({ ...item })), populated: [] as number[] };
  server.use(
    http.get(`${API}/api/pos/date-in-year`, () =>
      HttpResponse.json({ data: state.days, total: state.days.length, current: 1, pageSize: 400 })
    ),
    http.get(`${API}/api/pos/plan-screenings/available-dates`, () =>
      HttpResponse.json(screeningDates.map((date) => date.split("-").reverse().join("-")))
    ),
    http.put(`${API}/api/pos/date-in-year/:dateValue/holiday`, async ({ params, request }) => {
      const { holidayName } = (await request.json()) as { holidayName: string };
      const target = state.days.find((item) => item.dateValue === params.dateValue);
      if (!target) return HttpResponse.json({ message: "not found" }, { status: 404 });
      Object.assign(target, { isHoliday: true, holidayName });
      return HttpResponse.json(target);
    }),
    http.delete(`${API}/api/pos/date-in-year/:dateValue/holiday`, ({ params }) => {
      const target = state.days.find((item) => item.dateValue === params.dateValue);
      if (!target) return HttpResponse.json({ message: "not found" }, { status: 404 });
      Object.assign(target, { isHoliday: false, holidayName: null });
      return HttpResponse.json(target);
    }),
    http.post(`${API}/api/pos/date-in-year/populate/:year`, ({ params }) => {
      state.populated.push(Number(params.year));
      state.days = [day(`${params.year}-01-01`), day(`${params.year}-01-02`)];
      return HttpResponse.json(state.days);
    })
  );
  return state;
};

const renderPage = (canUpdate = true) => {
  usePermissionStore.setState({
    assignments: [
      { permissionKey: "holidays", actions: { access: true, list: true, update: canUpdate } }
    ]
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ token: { motion: false } }}>
        <App>
          <MemoryRouter initialEntries={["/holidays"]}>
            <HolidaysPage />
          </MemoryRouter>
        </App>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

const openTab = (label: RegExp) => fireEvent.click(screen.getByRole("tab", { name: label }));
const rowOf = (date: string) => screen.getByText(date).closest("tr") as HTMLElement;

describe("dateClassification", () => {
  it.each([
    ["2026-11-09", false, "normal"],
    ["2026-11-12", false, "normal"],
    ["2026-11-13", false, "weekend"],
    ["2026-11-15", false, "weekend"],
    ["2026-11-10", true, "holiday"],
    ["2026-11-14", true, "holiday"]
  ])("%s (holiday %p) → %s", (dateValue, isHoliday, expected) => {
    expect(classifyDate({ dateValue, isHoliday })).toBe(expected);
  });

  it("returns a holiday to the tab of its weekday", () => {
    expect(getTabAfterUnmark("2026-09-02")).toBe("normal");
    expect(getTabAfterUnmark("2026-09-05")).toBe("weekend");
  });
});

// Dialog/bảng antd: khi chạy song song toàn bộ test có thể chậm hơn mặc định 5 s (như test voucher giấy).
describe("HolidaysPage (Quản lý ngày V2)", { timeout: 30000 }, () => {
  beforeEach(() => queryClient.clear());

  it("splits the days into Ngày thường, Cuối tuần and Ngày lễ", async () => {
    const days = buildDays();
    await setupServer(days);
    renderPage();

    const expectedCounts = { normal: 0, weekend: 0, holiday: 0 };
    days.forEach((item) => (expectedCounts[classifyDate(item)] += 1));
    expect(
      await screen.findByRole("tab", { name: `Ngày thường (${expectedCounts.normal})` })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: `Cuối tuần (${expectedCounts.weekend})` })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: `Ngày lễ (${expectedCounts.holiday})` })
    ).toBeInTheDocument();

    openTab(/^Ngày lễ/);
    expect(await screen.findByText("Quốc khánh")).toBeInTheDocument();
    expect(
      within(rowOf(`02/09/${YEAR}`)).getByText("Giá T6, T7, CN và ngày lễ")
    ).toBeInTheDocument();
  });

  it("marks a day from its row; it moves to Ngày lễ and the U22 warning shows when it has screenings", async () => {
    const target = buildDays().find((item) => classifyDate(item) === "normal")!;
    const state = await setupServer(buildDays(), [target.dateValue]);
    renderPage();
    const label = dayjs(target.dateValue).format("DD/MM/YYYY");

    fireEvent.click(
      within(
        await screen.findByText(label).then((cell) => cell.closest("tr") as HTMLElement)
      ).getByRole("button", { name: "Đánh dấu ngày lễ" })
    );
    const dialog = await screen.findByRole("dialog");
    expect(
      await within(dialog).findByText(
        "Ngày này đã có suất chiếu. Sau khi lưu, vé chưa bán của các suất này không được áp ưu đãi U22."
      )
    ).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("Tên ngày lễ"), {
      target: { value: "  Ngày thử nghiệm  " }
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Lưu" }));

    await waitFor(() =>
      expect(state.days.find((item) => item.dateValue === target.dateValue)?.isHoliday).toBe(true)
    );
    expect(state.days.find((item) => item.dateValue === target.dateValue)?.holidayName).toBe(
      "Ngày thử nghiệm"
    );
    expect(await screen.findByText("Ngày thử nghiệm")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^Ngày lễ \(2\)/ })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("renames a holiday; Lưu stays disabled until the name changes", async () => {
    const state = await setupServer();
    renderPage();
    openTab(/^Ngày lễ/);

    await screen.findByText("Quốc khánh");
    fireEvent.click(within(rowOf(`02/09/${YEAR}`)).getByRole("button", { name: "Sửa" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Lưu" })).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText("Tên ngày lễ"), {
      target: { value: "Quốc khánh 2/9" }
    });
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Lưu" })).toBeEnabled());
    fireEvent.click(within(dialog).getByRole("button", { name: "Lưu" }));

    await waitFor(() =>
      expect(state.days.find((item) => item.dateValue === `${YEAR}-09-02`)?.holidayName).toBe(
        "Quốc khánh 2/9"
      )
    );
  });

  it("unmarks a holiday after a short confirmation; the row stays and returns to its weekday tab", async () => {
    const state = await setupServer();
    renderPage();
    openTab(/^Ngày lễ/);

    fireEvent.click(
      within(
        await screen.findByText("Quốc khánh").then((cell) => cell.closest("tr") as HTMLElement)
      ).getByRole("button", { name: "Bỏ đánh dấu" })
    );
    await waitFor(() =>
      expect(screen.getAllByText(`Bỏ đánh dấu ngày lễ 02/09/${YEAR}?`).length).toBeGreaterThan(0)
    );
    const dialogs = screen.getAllByRole("dialog");
    const confirmDialog = dialogs[dialogs.length - 1];
    fireEvent.click(within(confirmDialog).getByRole("button", { name: "Bỏ đánh dấu" }));

    await waitFor(() =>
      expect(state.days.find((item) => item.dateValue === `${YEAR}-09-02`)?.isHoliday).toBe(false)
    );
    expect(state.days).toHaveLength(7);
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Ngày lễ (0)" })).toBeInTheDocument()
    );
  });

  it("offers Khởi tạo năm when the year has no day (populate)", async () => {
    const state = await setupServer([]);
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: `Khởi tạo năm ${YEAR}` }));

    await waitFor(() => expect(state.populated).toEqual([YEAR]));
    expect(await screen.findByRole("tab", { name: /^Ngày thường/ })).toBeInTheDocument();
  });

  it("hides every write action without holidays.update", async () => {
    await setupServer();
    renderPage(false);

    expect(await screen.findByRole("tab", { name: /^Ngày thường/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Thêm ngày lễ/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Đánh dấu ngày lễ" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Cập nhật loại giá ngày/ })
    ).not.toBeInTheDocument();
  });
});
