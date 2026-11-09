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
import {
  classifyDate,
  findExceptions,
  getTabAfterUnmark,
  inferWeekdayConfig,
  planReclassification,
  WEEKDAY_TEMPLATES
} from "./dateClassification";
import HolidaysPage from "./HolidaysPage";
import {
  getDefaultHolidays,
  getStatutoryHolidays,
  lunarToSolar,
  NCC_HOLIDAYS
} from "./vietnameseHolidays";

const API = "http://date-management.test";
const YEAR = dayjs().year();
const TEMPLATE_A = WEEKDAY_TEMPLATES[0].config;
const TEMPLATE_B = WEEKDAY_TEMPLATES[1].config;
const PICK_A = /T2 – T5 ngày thường, T6 – CN cuối tuần/;
const PICK_B = /T2 – T6 ngày thường, T7 – CN cuối tuần/;
const SUBTITLE = "Phân loại các thứ trong tuần là ngày thường hoặc cuối tuần cho năm áp dụng.";

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

const label = (dateValue: string) => dayjs(dateValue).format("DD/MM/YYYY");
const isFriday = (dateValue: string) => dayjs(dateValue).day() === 5;

/** Ngày T2–T5 đầu tiên của tháng 1: ngoại lệ được xếp Cuối tuần (như 01/01 trên dữ liệu thật). */
const EXCEPTION = (() => {
  let value = dayjs(`${YEAR}-01-01`);
  while (![1, 2, 3, 4].includes(value.day())) value = value.add(1, "day");
  return value.format("YYYY-MM-DD");
})();
const HOLIDAY = `${YEAR}-09-02`;

const DEFAULT_HOLIDAYS = getDefaultHolidays(YEAR);

/**
 * Cả năm theo mẫu A (T6–CN cuối tuần), một ngày đặc biệt (ngoại lệ), 02/09 là ngày lễ NCC đặt tên
 * "Quốc khánh". `withDefaultHolidays`: các ngày lễ mặc định khác cũng đã được đánh dấu.
 */
const buildYear = (withDefaultHolidays = false) => {
  const start = dayjs(`${YEAR}-01-01`);
  const total = start.add(1, "year").diff(start, "day");
  const defaults = new Map(DEFAULT_HOLIDAYS.map((holiday) => [holiday.dateValue, holiday]));
  return Array.from({ length: total }, (_, index) => {
    const dateValue = start.add(index, "day").format("YYYY-MM-DD");
    const dateTypeId =
      dateValue === EXCEPTION ? 2 : TEMPLATE_A[dayjs(dateValue).day()] === "weekend" ? 2 : 1;
    if (dateValue === HOLIDAY)
      return day(dateValue, { dateTypeId, isHoliday: true, holidayName: "Quốc khánh" });
    const holiday = defaults.get(dateValue);
    if (withDefaultHolidays && holiday)
      return day(dateValue, { dateTypeId, isHoliday: true, holidayName: holiday.holidayName });
    return day(dateValue, { dateTypeId });
  });
};

type BulkCall = { year: number; dateTypeId: number; daysInWeek: number[]; specialDates: string[] };
type InitializeCall = {
  year: number;
  weekendDays: number[];
  holidays: { dateValue: string; holidayName: string }[];
};

const setupServer = async (
  initialDays: HolidayProps[] = buildYear(),
  screeningDates: string[] = []
) => {
  await initApi(API);
  const state = {
    days: initialDays.map((item) => ({ ...item })),
    initializeCalls: [] as InitializeCall[],
    bulkCalls: [] as BulkCall[],
    marked: [] as string[]
  };
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
      state.marked.push(String(params.dateValue));
      Object.assign(target, { isHoliday: true, holidayName });
      return HttpResponse.json(target);
    }),
    http.delete(`${API}/api/pos/date-in-year/:dateValue/holiday`, ({ params }) => {
      const target = state.days.find((item) => item.dateValue === params.dateValue);
      if (!target) return HttpResponse.json({ message: "not found" }, { status: 404 });
      Object.assign(target, { isHoliday: false, holidayName: null });
      return HttpResponse.json(target);
    }),
    // Như backend: chỉ đổi DateTypeId của các ngày trong daysInWeek / specialDates, giữ cờ lễ.
    http.post(`${API}/api/pos/date-in-year/bulk-create`, async ({ request }) => {
      const body = (await request.json()) as BulkCall;
      state.bulkCalls.push(body);
      state.days.forEach((item) => {
        const matches =
          body.daysInWeek.includes(dayjs(item.dateValue).day()) ||
          body.specialDates.includes(item.dateValue.slice(5));
        if (matches) item.dateTypeId = body.dateTypeId;
      });
      return HttpResponse.json([]);
    }),
    // Như backend: tạo các ngày còn thiếu theo thứ, đánh dấu ngày lễ đã chọn, không đổi ngày đã có.
    http.post(`${API}/api/pos/date-in-year/initialize/:year`, async ({ params, request }) => {
      const year = Number(params.year);
      const body = (await request.json()) as Omit<InitializeCall, "year">;
      state.initializeCalls.push({ year, ...body });
      const names = new Map(
        body.holidays.map((holiday) => [holiday.dateValue, holiday.holidayName])
      );
      const start = dayjs(`${year}-01-01`);
      const known = new Set(state.days.map((item) => item.dateValue));
      const created = Array.from({ length: start.add(1, "year").diff(start, "day") }, (_, index) =>
        start.add(index, "day").format("YYYY-MM-DD")
      )
        .filter((dateValue) => !known.has(dateValue))
        .map((dateValue) =>
          day(dateValue, {
            dateTypeId: body.weekendDays.includes(dayjs(dateValue).day()) ? 2 : 1,
            isHoliday: names.has(dateValue),
            holidayName: names.get(dateValue) ?? null
          })
        );
      state.days = [...state.days, ...created];
      return HttpResponse.json({
        year,
        createdDays: created.length,
        weekendDayCount: created.filter((item) => item.dateTypeId === 2).length,
        holidayCount: created.filter((item) => item.isHoliday).length
      });
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

const openTab = (name: RegExp) => fireEvent.click(screen.getByRole("tab", { name }));
const rowOf = (text: string) => screen.getByText(text).closest("tr") as HTMLElement;
const countOf = (days: HolidayProps[], tab: ReturnType<typeof classifyDate>) =>
  days.filter((item) => classifyDate(item) === tab).length;
const expectTabCounts = async (days: HolidayProps[]) => {
  for (const [name, tab] of [
    ["Ngày thường", "normal"],
    ["Cuối tuần", "weekend"],
    ["Ngày lễ", "holiday"]
  ] as const) {
    expect(
      await screen.findByRole("tab", { name: `${name} (${countOf(days, tab)})` })
    ).toBeInTheDocument();
  }
};
/** Mở menu "⋯" của một ngày (cột thao tác như các bảng khác) và bấm một mục. */
const chooseDayAction = async (dateValue: string, action: string) => {
  fireEvent.click(await screen.findByRole("button", { name: `Thao tác ngày ${label(dateValue)}` }));
  // Popup Dropdown cũ vẫn có thể nằm trong DOM; popup vừa mở luôn gắn cuối body.
  const menu = await waitFor(() => {
    const menus = document.querySelectorAll<HTMLElement>(
      ".ant-dropdown:not(.ant-dropdown-hidden) [role='menu']"
    );
    if (!menus.length) throw new Error("Menu thao tác chưa mở");
    return menus[menus.length - 1];
  });
  fireEvent.click(within(menu).getByRole("menuitem", { name: action }));
};
const lastDialog = () => {
  const dialogs = screen.getAllByRole("dialog");
  return dialogs[dialogs.length - 1];
};
const openClassificationDialog = async () => {
  fireEvent.click(await screen.findByRole("button", { name: /Thiết lập phân loại ngày/ }));
  const dialog = await screen.findByRole("dialog");
  await within(dialog).findByText("Thứ 6");
  return dialog;
};
const weekdayRow = (dialog: HTMLElement, weekday: string) =>
  within(dialog).getByText(weekday, { exact: true }).closest("div") as HTMLElement;
const confirmSave = async (dialog: HTMLElement) => {
  fireEvent.click(within(dialog).getByRole("button", { name: /Lưu thiết lập/ }));
  await waitFor(() => expect(screen.getAllByRole("dialog").length).toBeGreaterThan(1));
  const confirm = lastDialog();
  fireEvent.click(within(confirm).getByRole("button", { name: "Cập nhật" }));
  return confirm;
};

describe("vietnameseHolidays", () => {
  it.each([
    [2023, "2023-01-22", "2023-04-29"],
    [2024, "2024-02-10", "2024-04-18"],
    [2025, "2025-01-29", "2025-04-07"],
    [2026, "2026-02-17", "2026-04-26"],
    [2027, "2027-02-06", "2027-04-16"]
  ])("%i: Tết %s, Giỗ Tổ %s (âm lịch Việt Nam, kể cả năm nhuận)", (year, tet, gioTo) => {
    expect(lunarToSolar(1, 1, year)).toBe(tet);
    expect(lunarToSolar(10, 3, year)).toBe(gioTo);
  });

  it("lists the 11 statutory holidays of a year", () => {
    expect(getStatutoryHolidays(2026)).toEqual([
      { dateValue: "2026-01-01", holidayName: "Tết Dương lịch" },
      { dateValue: "2026-02-16", holidayName: "Tết Nguyên đán (29 Tết)" },
      { dateValue: "2026-02-17", holidayName: "Tết Nguyên đán (Mùng 1)" },
      { dateValue: "2026-02-18", holidayName: "Tết Nguyên đán (Mùng 2)" },
      { dateValue: "2026-02-19", holidayName: "Tết Nguyên đán (Mùng 3)" },
      { dateValue: "2026-02-20", holidayName: "Tết Nguyên đán (Mùng 4)" },
      { dateValue: "2026-04-26", holidayName: "Giỗ Tổ Hùng Vương" },
      { dateValue: "2026-04-30", holidayName: "Ngày Giải phóng miền Nam" },
      { dateValue: "2026-05-01", holidayName: "Ngày Quốc tế Lao động" },
      { dateValue: "2026-09-01", holidayName: "Quốc khánh (nghỉ liền kề)" },
      { dateValue: "2026-09-02", holidayName: "Quốc khánh" }
    ]);
    expect(getDefaultHolidays(2024)[1]).toEqual({
      dateValue: "2024-02-09",
      holidayName: "Tết Nguyên đán (30 Tết)"
    });
  });

  it("default holidays = 11 statutory days + the 6 NCC days (D18), sorted by date", () => {
    const actualHolidays = getDefaultHolidays(2026);

    expect(actualHolidays).toHaveLength(17);
    expect(actualHolidays).toEqual(expect.arrayContaining(getStatutoryHolidays(2026)));
    expect(actualHolidays).toEqual(
      expect.arrayContaining([
        { dateValue: "2026-02-14", holidayName: "Valentine" },
        { dateValue: "2026-03-08", holidayName: "Quốc tế Phụ nữ" },
        { dateValue: "2026-10-20", holidayName: "Phụ nữ Việt Nam" },
        { dateValue: "2026-10-31", holidayName: "Halloween" },
        { dateValue: "2026-11-20", holidayName: "Nhà giáo Việt Nam" },
        { dateValue: "2026-12-24", holidayName: "Giáng sinh" }
      ])
    );
    const dates = actualHolidays.map((holiday) => holiday.dateValue);
    expect(dates).toEqual([...dates].sort());
    expect(NCC_HOLIDAYS).toHaveLength(6);
  });

  it("a NCC day falling on a statutory holiday is listed once, with the statutory name", () => {
    // 14/02/2029 là Tết Mùng 2.
    const actualHolidays = getDefaultHolidays(2029);

    expect(actualHolidays).toHaveLength(16);
    expect(actualHolidays.filter((holiday) => holiday.dateValue === "2029-02-14")).toEqual([
      { dateValue: "2029-02-14", holidayName: "Tết Nguyên đán (Mùng 2)" }
    ]);
  });
});

describe("dateClassification", () => {
  it.each([
    [{ dateTypeId: 1, isHoliday: false }, "normal"],
    [{ dateTypeId: 2, isHoliday: false }, "weekend"],
    [{ dateTypeId: 1, isHoliday: true }, "holiday"],
    [{ dateTypeId: 2, isHoliday: true }, "holiday"]
  ])("%o → %s (theo phân loại thực tế, không theo thứ)", (input, expected) => {
    expect(classifyDate(input)).toBe(expected);
  });

  it("a holiday returns to its base classification", () => {
    expect(getTabAfterUnmark({ dateTypeId: 1 })).toBe("normal");
    expect(getTabAfterUnmark({ dateTypeId: 2 })).toBe("weekend");
  });

  it("reads the real per-weekday configuration (majority) and its exceptions", () => {
    const days = buildYear();
    expect(inferWeekdayConfig(days)).toEqual(TEMPLATE_A);
    expect(findExceptions(days, TEMPLATE_A).map((item) => item.dateValue)).toEqual([EXCEPTION]);
    const fridaysNormal = days.map((item) =>
      isFriday(item.dateValue) ? { ...item, dateTypeId: 1 } : item
    );
    expect(inferWeekdayConfig(fridaysNormal)).toEqual(TEMPLATE_B);
  });

  it("plans only the days that change and keeps exceptions unless asked", () => {
    const days = buildYear();
    const fridays = days.filter((item) => isFriday(item.dateValue));
    const toB = planReclassification({
      days,
      current: TEMPLATE_A,
      next: TEMPLATE_B,
      keepExceptions: true
    });
    expect(toB.toNormal.map((item) => item.dateValue)).toEqual(
      fridays.map((item) => item.dateValue)
    );
    expect(toB.toWeekend).toEqual([]);
    expect(toB.keptExceptions.map((item) => item.dateValue)).toEqual([EXCEPTION]);

    const overwrite = planReclassification({
      days,
      current: TEMPLATE_A,
      next: TEMPLATE_B,
      keepExceptions: false
    });
    expect(overwrite.toNormal.map((item) => item.dateValue)).toContain(EXCEPTION);
    expect(overwrite.keptExceptions).toEqual([]);

    const same = planReclassification({
      days,
      current: TEMPLATE_A,
      next: TEMPLATE_A,
      keepExceptions: true
    });
    expect([...same.toNormal, ...same.toWeekend]).toEqual([]);
  });
});

// Dialog/bảng antd: khi chạy song song toàn bộ test có thể chậm hơn mặc định 5 s (như test voucher giấy).
describe("HolidaysPage (Danh sách ngày)", { timeout: 30000 }, () => {
  beforeEach(() => queryClient.clear());

  it("splits the days by their real classification; no ticket price on the screen", async () => {
    // Một Thứ 6 xếp Ngày thường và một Thứ 4 xếp Cuối tuần: tab đi theo dữ liệu, không theo thứ.
    const days = buildYear();
    const friday = days.find((item) => isFriday(item.dateValue))!;
    friday.dateTypeId = 1;
    await setupServer(days);
    renderPage();

    await expectTabCounts(days);
    expect(await screen.findByRole("columnheader", { name: "Phân loại ngày" })).toBeInTheDocument();
    expect(within(rowOf(label(friday.dateValue))).getByText("Ngày thường")).toBeInTheDocument();
    expect(screen.queryByText(/Giá|giá vé|VNĐ|\d{2}\.000/)).not.toBeInTheDocument();

    openTab(/^Ngày lễ/);
    expect(await screen.findByText("Quốc khánh")).toBeInTheDocument();
    expect(within(rowOf(label(HOLIDAY))).getByText("Ngày lễ")).toBeInTheDocument();
    expect(screen.queryByText(/Khi bỏ đánh dấu/)).not.toBeInTheDocument();
  });

  it("marks a day from its row; it moves to Ngày lễ and the U22 warning shows when it has screenings", async () => {
    const target = buildYear().find((item) => classifyDate(item) === "normal")!;
    const state = await setupServer(buildYear(), [target.dateValue]);
    renderPage();

    await chooseDayAction(target.dateValue, "Đánh dấu ngày lễ");
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
    const marked = state.days.find((item) => item.dateValue === target.dateValue)!;
    expect(marked).toMatchObject({ holidayName: "Ngày thử nghiệm", dateTypeId: target.dateTypeId });
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
    await chooseDayAction(HOLIDAY, "Cập nhật");
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Lưu" })).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText("Tên ngày lễ"), {
      target: { value: "Quốc khánh 2/9" }
    });
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Lưu" })).toBeEnabled());
    fireEvent.click(within(dialog).getByRole("button", { name: "Lưu" }));

    await waitFor(() =>
      expect(state.days.find((item) => item.dateValue === HOLIDAY)?.holidayName).toBe(
        "Quốc khánh 2/9"
      )
    );
  });

  it("unmarks a weekend holiday: it returns to Cuối tuần, its base classification is kept", async () => {
    const days = buildYear();
    const saturday = days.find((item) => dayjs(item.dateValue).day() === 6)!;
    Object.assign(saturday, { isHoliday: true, holidayName: "Lễ cuối tuần" });
    const state = await setupServer(days);
    renderPage();
    openTab(/^Ngày lễ/);

    await screen.findByText("Lễ cuối tuần");
    await chooseDayAction(saturday.dateValue, "Bỏ đánh dấu ngày lễ");
    await waitFor(() =>
      expect(
        screen.getAllByText(`Bỏ đánh dấu ngày lễ ${label(saturday.dateValue)}?`).length
      ).toBeGreaterThan(0)
    );
    const confirm = lastDialog();
    expect(within(confirm).getByText(/sẽ trở về tab Cuối tuần/)).toBeInTheDocument();
    fireEvent.click(within(confirm).getByRole("button", { name: "Bỏ đánh dấu" }));

    await waitFor(() =>
      expect(state.days.find((item) => item.dateValue === saturday.dateValue)).toMatchObject({
        isHoliday: false,
        holidayName: null,
        dateTypeId: 2
      })
    );
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Ngày lễ (1)" })).toBeInTheDocument()
    );
    await expectTabCounts(state.days);
  });

  it(
    "Thiết lập ngày: reads the real setup, switches A → B keeping exceptions, then back to A",
    { timeout: 90000 },
    async () => {
      const state = await setupServer(buildYear(true));
      renderPage();
      const fridays = state.days.filter((item) => isFriday(item.dateValue));

      let dialog = await openClassificationDialog();
      expect(within(dialog).getByText("Thiết lập ngày", { exact: true })).toBeInTheDocument();
      expect(within(dialog).getByText(SUBTITLE)).toBeInTheDocument();
      expect(within(dialog).getByText("Quy tắc")).toBeInTheDocument();
      expect(within(dialog).getByRole("radio", { name: PICK_A })).toBeChecked();
      expect(within(dialog).queryByText("Tùy chỉnh")).not.toBeInTheDocument();
      expect(
        within(weekdayRow(dialog, "Thứ 6")).getByRole("radio", { name: "Cuối tuần" })
      ).toBeChecked();
      expect(
        within(weekdayRow(dialog, "Thứ 2")).getByRole("radio", { name: "Ngày thường" })
      ).toBeChecked();
      expect(
        within(dialog).getByText(/có 1 ngày đặc biệt \(luôn giữ nguyên\)/)
      ).toBeInTheDocument();
      expect(within(dialog).queryByRole("checkbox")).not.toBeInTheDocument();
      expect(within(dialog).getByTestId("default-holiday-line")).toHaveTextContent(
        `Đủ ${DEFAULT_HOLIDAYS.length} ngày lễ mặc định của năm ${YEAR}.`
      );
      expect(within(dialog).getByText(/Chưa có thay đổi/)).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: /Lưu thiết lập/ })).toBeDisabled();

      // Chọn mẫu B: cả 7 thứ đổi ngay trên form, chưa ghi DB.
      fireEvent.click(within(dialog).getByRole("radio", { name: PICK_B }));
      expect(within(dialog).getByRole("radio", { name: PICK_B })).toBeChecked();
      expect(
        within(weekdayRow(dialog, "Thứ 6")).getByRole("radio", { name: "Ngày thường" })
      ).toBeChecked();
      expect(state.bulkCalls).toHaveLength(0);
      expect(within(dialog).getByTestId("day-classification-summary")).toHaveTextContent(
        `Sẽ cập nhật ${fridays.length} ngày: ${fridays.length} ngày sang Ngày thường, 0 ngày sang Cuối tuần; giữ nguyên 1 ngày đặc biệt.`
      );
      const confirm = await confirmSave(dialog);
      expect(
        within(confirm).getByText(`${fridays.length} ngày chuyển sang Ngày thường.`)
      ).toBeInTheDocument();

      await waitFor(() => expect(state.bulkCalls).toHaveLength(1));
      expect(state.bulkCalls[0]).toMatchObject({ year: YEAR, dateTypeId: 1, daysInWeek: [] });
      expect(state.bulkCalls[0].specialDates).toEqual(
        fridays.map((item) => item.dateValue.slice(5))
      );
      expect(state.days.find((item) => item.dateValue === EXCEPTION)?.dateTypeId).toBe(2);
      expect(state.days.find((item) => item.dateValue === HOLIDAY)).toMatchObject({
        isHoliday: true,
        holidayName: "Quốc khánh"
      });
      await waitFor(() => expect(screen.queryByText(SUBTITLE)).not.toBeInTheDocument());
      await expectTabCounts(state.days);

      // Quay lại mẫu A: dialog đọc cấu hình mới (Thứ 6 = Ngày thường), lưu đổi các Thứ 6 sang Cuối tuần.
      dialog = await openClassificationDialog();
      expect(
        within(weekdayRow(dialog, "Thứ 6")).getByRole("radio", { name: "Ngày thường" })
      ).toBeChecked();
      expect(within(dialog).getByRole("radio", { name: PICK_B })).toBeChecked();
      fireEvent.click(within(dialog).getByRole("radio", { name: PICK_A }));
      await confirmSave(dialog);
      await waitFor(() => expect(state.bulkCalls).toHaveLength(2));
      expect(state.bulkCalls[1]).toMatchObject({
        dateTypeId: 2,
        specialDates: fridays.map((item) => item.dateValue.slice(5))
      });
      await expectTabCounts(state.days);
    }
  );

  it("sets one weekday independently; the special day set by NCC is always kept", async () => {
    const state = await setupServer(buildYear(true));
    renderPage();

    // Thứ 7 → Ngày thường (độc lập với các thứ khác): chỉ các Thứ 7 đổi, ngày đặc biệt giữ nguyên.
    const saturdays = state.days.filter((item) => dayjs(item.dateValue).day() === 6);
    const dialog = await openClassificationDialog();
    fireEvent.click(
      within(weekdayRow(dialog, "Thứ 7")).getByRole("radio", { name: "Ngày thường" })
    );
    expect(within(weekdayRow(dialog, "Thứ 7")).getByText("Đã đổi")).toBeInTheDocument();
    // Không còn khớp mẫu A/B: hiện "Tùy chỉnh", không mẫu nào được chọn.
    expect(within(dialog).getByText("Tùy chỉnh")).toBeInTheDocument();
    expect(within(dialog).getByRole("radio", { name: PICK_A })).not.toBeChecked();
    expect(within(dialog).getByRole("radio", { name: PICK_B })).not.toBeChecked();
    expect(
      within(weekdayRow(dialog, "Thứ 6")).getByRole("radio", { name: "Cuối tuần" })
    ).toBeChecked();
    expect(within(dialog).getByTestId("day-classification-summary")).toHaveTextContent(
      `${saturdays.length} ngày sang Ngày thường`
    );
    await confirmSave(dialog);

    await waitFor(() => expect(state.bulkCalls).toHaveLength(1));
    expect(state.bulkCalls[0]).toMatchObject({ dateTypeId: 1 });
    expect(state.bulkCalls[0].specialDates).toEqual(
      saturdays.map((item) => item.dateValue.slice(5))
    );
    expect(state.days.find((item) => item.dateValue === EXCEPTION)?.dateTypeId).toBe(2);
    expect(state.marked).toEqual([]);
  });

  it("missing default holidays are listed unchecked: nothing is marked and Lưu stays disabled until the admin picks", async () => {
    const state = await setupServer(buildYear(false));
    renderPage();
    const missing = DEFAULT_HOLIDAYS.filter((holiday) => holiday.dateValue !== HOLIDAY);
    const typesBefore = new Map(state.days.map((item) => [item.dateValue, item.dateTypeId]));
    const [picked, alsoPicked] = missing;

    const dialog = await openClassificationDialog();
    const line = within(dialog).getByTestId("default-holiday-line");
    expect(line).toHaveTextContent(`còn ${missing.length} ngày lễ mặc định chưa đánh dấu`);
    const boxes = within(line).getAllByRole("checkbox");
    expect(boxes).toHaveLength(missing.length);
    boxes.forEach((box) => expect(box).not.toBeChecked());
    // Admin chưa đổi gì: không được lưu (không tự đánh dấu ngày lễ).
    expect(within(dialog).getByText(/Chưa có thay đổi/)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /Lưu thiết lập/ })).toBeDisabled();

    for (const holiday of [picked, alsoPicked])
      fireEvent.click(
        within(line).getByRole("checkbox", {
          name: new RegExp(holiday.holidayName.replace(/[()]/g, "."))
        })
      );
    expect(within(dialog).getByTestId("day-classification-summary")).toHaveTextContent(
      "Sẽ đánh dấu 2 ngày lễ mặc định."
    );
    await confirmSave(dialog);

    await waitFor(() => expect(state.marked).toEqual([picked.dateValue, alsoPicked.dateValue]));
    expect(state.bulkCalls).toEqual([]);
    [picked, alsoPicked].forEach((holiday) =>
      expect(state.days.find((item) => item.dateValue === holiday.dateValue)).toMatchObject({
        isHoliday: true,
        holidayName: holiday.holidayName,
        dateTypeId: typesBefore.get(holiday.dateValue)
      })
    );
    missing
      .slice(2)
      .forEach((holiday) =>
        expect(state.days.find((item) => item.dateValue === holiday.dateValue)?.isHoliday).toBe(
          false
        )
      );
    expect(state.days.find((item) => item.dateValue === HOLIDAY)?.holidayName).toBe("Quốc khánh");
  });

  it("a default holiday the admin unmarked is not re-marked by the next classification save", async () => {
    // Năm đủ ngày lễ mặc định, Admin bỏ đánh dấu 01/09 (năm đó Chính phủ chọn 03/09).
    const adjacent = `${YEAR}-09-01`;
    const initialDays = buildYear(true).map((item) =>
      item.dateValue === adjacent ? { ...item, isHoliday: false, holidayName: null } : item
    );
    const state = await setupServer(initialDays);
    renderPage();

    const dialog = await openClassificationDialog();
    expect(
      within(dialog).getByRole("checkbox", { name: /Quốc khánh \(nghỉ liền kề\)/ })
    ).not.toBeChecked();
    expect(within(dialog).getByRole("button", { name: /Lưu thiết lập/ })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole("radio", { name: PICK_B }));
    await confirmSave(dialog);

    await waitFor(() => expect(state.bulkCalls).toHaveLength(1));
    expect(state.marked).toEqual([]);
    expect(state.days.find((item) => item.dateValue === adjacent)?.isHoliday).toBe(false);
  });

  it("Khởi tạo năm creates the whole year: T2–T5 normal, T6–CN weekend and the checked default holidays", async () => {
    const state = await setupServer([]);
    renderPage();
    const adjacent = `${YEAR}-09-01`;

    // Chạy cả file trên máy bận: chờ lâu hơn mặc định 1 s của findBy.
    fireEvent.click(
      await screen.findByRole("button", { name: `Khởi tạo năm ${YEAR}` }, { timeout: 10000 })
    );
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("radio", { name: PICK_A })).toBeChecked();
    const boxes = within(dialog).getAllByRole("checkbox");
    expect(boxes).toHaveLength(DEFAULT_HOLIDAYS.length);
    boxes.forEach((box) => expect(box).toBeChecked());
    // Bỏ chọn được ngày lễ mặc định (vd. ngày liền kề Quốc khánh).
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /Quốc khánh \(nghỉ liền kề\)/ }));
    expect(within(dialog).getByTestId("initialize-year-summary")).toHaveTextContent(
      `đánh dấu ${DEFAULT_HOLIDAYS.length - 1} ngày lễ`
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Khởi tạo" }));

    await waitFor(() => expect(state.initializeCalls).toHaveLength(1));
    expect(state.initializeCalls[0]).toEqual({
      year: YEAR,
      weekendDays: [5, 6, 0],
      holidays: DEFAULT_HOLIDAYS.filter((holiday) => holiday.dateValue !== adjacent)
    });
    expect(
      await screen.findByText(new RegExp(`Đã khởi tạo .* ngày cho năm ${YEAR}`), undefined, {
        timeout: 10000
      })
    ).toBeInTheDocument();
    await expectTabCounts(state.days);
    expect(state.days.filter((item) => item.isHoliday)).toHaveLength(DEFAULT_HOLIDAYS.length - 1);
  });

  it("Khởi tạo năm with template B sends Saturday and Sunday as weekend", async () => {
    const state = await setupServer([]);
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", { name: `Khởi tạo năm ${YEAR}` }, { timeout: 10000 })
    );
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("radio", { name: PICK_B }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Khởi tạo" }));

    await waitFor(() => expect(state.initializeCalls).toHaveLength(1));
    expect(state.initializeCalls[0].weekendDays).toEqual([6, 0]);
    expect(state.initializeCalls[0].holidays).toEqual(DEFAULT_HOLIDAYS);
  });

  it("a year missing some days warns, lists default holidays without a row, and creates only the missing days", async () => {
    // Năm đủ ngày lễ mặc định nhưng mất cả tháng 12 (vd. dòng bị xóa tay).
    const isDecember = (dateValue: string) => dateValue.startsWith(`${YEAR}-12-`);
    const state = await setupServer(buildYear(true).filter((item) => !isDecember(item.dateValue)));
    const decemberHolidays = DEFAULT_HOLIDAYS.filter((holiday) => isDecember(holiday.dateValue));
    renderPage();

    const alert = await screen.findByTestId("partial-year-alert", undefined, { timeout: 10000 });
    expect(alert).toHaveTextContent(`Năm ${YEAR} còn thiếu 31 ngày`);

    const classification = await openClassificationDialog();
    expect(within(classification).getByTestId("default-holiday-no-row-line")).toHaveTextContent(
      `${decemberHolidays.length} ngày lễ mặc định chưa có trong Danh sách ngày`
    );
    expect(within(classification).queryByText(/Đủ \d+ ngày lễ mặc định/)).not.toBeInTheDocument();
    fireEvent.click(within(classification).getByRole("button", { name: "Hủy" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    fireEvent.click(within(alert).getByRole("button", { name: "Tạo các ngày còn thiếu" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(`Tạo các ngày còn thiếu năm ${YEAR}`)).toBeInTheDocument();
    expect(within(dialog).getAllByRole("checkbox")).toHaveLength(decemberHolidays.length);
    expect(within(dialog).getByTestId("initialize-year-summary")).toHaveTextContent("Tạo 31 ngày");
    fireEvent.click(within(dialog).getByRole("button", { name: "Khởi tạo" }));

    await waitFor(() => expect(state.initializeCalls).toHaveLength(1));
    expect(state.initializeCalls[0]).toEqual({
      year: YEAR,
      weekendDays: [5, 6, 0],
      holidays: decemberHolidays
    });
    await waitFor(() => expect(screen.queryByTestId("partial-year-alert")).not.toBeInTheDocument());
  });

  it("hides every write action without holidays.update", async () => {
    await setupServer();
    renderPage(false);

    expect(await screen.findByRole("tab", { name: /^Ngày thường/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Thêm ngày lễ/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Thao tác ngày/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Thiết lập phân loại ngày/ })
    ).not.toBeInTheDocument();
  });
});
