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
/** Body gửi tới backend cũ (rules 404): chỉ tên ngày lễ, không có "Giá vé áp dụng". */
const namesOnly = (holidays: { dateValue: string; holidayName: string }[]) =>
  holidays.map(({ dateValue, holidayName }) => ({ dateValue, holidayName }));

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
  holidays: { dateValue: string; holidayName: string; applyHolidayPrice?: boolean }[];
};
type MarkBody = { holidayName: string; applyHolidayPrice?: boolean };

/** Năng lực backend V3.2 (`GET /api/pos/pricing/rules`). Không gọi: backend cũ (404, handler mặc định). */
const V32_RULES = {
  ruleVersion: "holiday-v3.2",
  schema: { holidayPriceMode: true, promotionExclusion: true, screeningPolicy: true },
  ready: true,
  enforcedPolicies: ["U22"]
};
const SCHEMA_NOT_READY_RULES = {
  ...V32_RULES,
  schema: { ...V32_RULES.schema, holidayPriceMode: false },
  ready: false
};
const useV32Backend = (rules: Record<string, unknown> = V32_RULES) =>
  server.use(http.get(`${API}/api/pos/pricing/rules`, () => HttpResponse.json(rules)));
/** Dữ liệu ngày như backend V3.2 trả: có `applyHolidayPrice` và `isPromotionExcluded`. */
const asV32 = (days: HolidayProps[]) =>
  days.map((item) => ({
    ...item,
    applyHolidayPrice: item.isHoliday ? (item.applyHolidayPrice ?? true) : false,
    isPromotionExcluded: item.isPromotionExcluded ?? false
  }));
/** Không được ngụ ý hệ thống chặn mọi ưu đãi (phạm vi V3.2 chỉ U22). */
const CLAIMS_ALL_PROMOTIONS = /mọi (ưu đãi|chương trình)|tất cả (ưu đãi|khuyến)/i;
/** Ngày chưa qua trong năm đang xem (31/12 không bao giờ là ngày đã qua trong năm hiện tại). */
const FUTURE_DAY = `${YEAR}-12-31`;
/** Ngày đã qua (01/01), trừ khi test chạy đúng ngày 01/01. */
const PAST_DAY = `${YEAR}-01-01`;
const IS_PAST_DAY_PAST = dayjs().format("MM-DD") !== "01-01";
const DAY_SAVED_MESSAGE = "Đã cập nhật thiết lập ngày. Giá các suất đã lập không tự thay đổi.";
/** Mục của menu "⋯" đang mở (popup mới nhất). */
const openDayMenu = async (dateValue: string) => {
  fireEvent.click(await screen.findByRole("button", { name: `Thao tác ngày ${label(dateValue)}` }));
  return waitFor(() => {
    const menus = document.querySelectorAll<HTMLElement>(
      ".ant-dropdown:not(.ant-dropdown-hidden) [role='menu']"
    );
    if (!menus.length) throw new Error("Menu thao tác chưa mở");
    return menus[menus.length - 1];
  });
};
const menuLabels = (menu: HTMLElement) =>
  within(menu)
    .getAllByRole("menuitem")
    .map((item) => item.textContent);

const setupServer = async (
  initialDays: HolidayProps[] = buildYear(),
  screeningDates: string[] = []
) => {
  await initApi(API);
  const state = {
    days: initialDays.map((item) => ({ ...item })),
    initializeCalls: [] as InitializeCall[],
    bulkCalls: [] as BulkCall[],
    marked: [] as string[],
    markBodies: [] as MarkBody[],
    exclusionCalls: [] as { dateValue: string; excluded: boolean }[]
  };
  server.use(
    http.get(`${API}/api/pos/date-in-year`, () =>
      HttpResponse.json({ data: state.days, total: state.days.length, current: 1, pageSize: 400 })
    ),
    http.get(`${API}/api/pos/plan-screenings/available-dates`, () =>
      HttpResponse.json(screeningDates.map((date) => date.split("-").reverse().join("-")))
    ),
    // Như backend V3.2: chỉ đổi IsHoliday, HolidayName và (nếu gửi) ApplyHolidayPrice; trả số suất của ngày.
    http.put(`${API}/api/pos/date-in-year/:dateValue/holiday`, async ({ params, request }) => {
      const body = (await request.json()) as MarkBody;
      const target = state.days.find((item) => item.dateValue === params.dateValue);
      if (!target) return HttpResponse.json({ message: "not found" }, { status: 404 });
      state.marked.push(String(params.dateValue));
      state.markBodies.push(body);
      Object.assign(target, { isHoliday: true, holidayName: body.holidayName });
      if (body.applyHolidayPrice !== undefined) target.applyHolidayPrice = body.applyHolidayPrice;
      return HttpResponse.json({
        ...target,
        existingScreenings: screeningDates.includes(target.dateValue) ? 3 : 0
      });
    }),
    http.delete(`${API}/api/pos/date-in-year/:dateValue/holiday`, ({ params }) => {
      const target = state.days.find((item) => item.dateValue === params.dateValue);
      if (!target) return HttpResponse.json({ message: "not found" }, { status: 404 });
      Object.assign(target, { isHoliday: false, holidayName: null });
      return HttpResponse.json(target);
    }),
    http.put(
      `${API}/api/pos/date-in-year/:dateValue/promotion-exclusion`,
      async ({ params, request }) => {
        const { excluded } = (await request.json()) as { excluded: boolean };
        const target = state.days.find((item) => item.dateValue === params.dateValue);
        if (!target) return HttpResponse.json({ message: "not found" }, { status: 404 });
        state.exclusionCalls.push({ dateValue: String(params.dateValue), excluded });
        target.isPromotionExcluded = excluded;
        return HttpResponse.json(target);
      }
    ),
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
      const names = new Map(body.holidays.map((holiday) => [holiday.dateValue, holiday]));
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
            holidayName: names.get(dateValue)?.holidayName ?? null,
            applyHolidayPrice: names.get(dateValue)?.applyHolidayPrice ?? true
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

const renderPage = (canUpdate = true, canViewPlans = false, canViewAudit = false) => {
  usePermissionStore.setState({
    assignments: [
      { permissionKey: "holidays", actions: { access: true, list: true, update: canUpdate } },
      ...(canViewPlans
        ? [{ permissionKey: "plan_cinema", actions: { access: true, list: true, view: true } }]
        : []),
      ...(canViewAudit
        ? [{ permissionKey: "access_history", actions: { access: true, list: true, view: true } }]
        : [])
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

  it("lists the 11 statutory holidays of a year, all suggested Giá ngày lễ", () => {
    const holiday = (dateValue: string, holidayName: string) => ({
      dateValue,
      holidayName,
      applyHolidayPrice: true
    });
    expect(getStatutoryHolidays(2026)).toEqual([
      holiday("2026-01-01", "Tết Dương lịch"),
      holiday("2026-02-16", "Tết Nguyên đán (29 Tết)"),
      holiday("2026-02-17", "Tết Nguyên đán (Mùng 1)"),
      holiday("2026-02-18", "Tết Nguyên đán (Mùng 2)"),
      holiday("2026-02-19", "Tết Nguyên đán (Mùng 3)"),
      holiday("2026-02-20", "Tết Nguyên đán (Mùng 4)"),
      holiday("2026-04-26", "Giỗ Tổ Hùng Vương"),
      holiday("2026-04-30", "Ngày Giải phóng miền Nam"),
      holiday("2026-05-01", "Ngày Quốc tế Lao động"),
      holiday("2026-09-01", "Quốc khánh (nghỉ liền kề)"),
      holiday("2026-09-02", "Quốc khánh")
    ]);
    expect(getDefaultHolidays(2024)[1]).toEqual(holiday("2024-02-09", "Tết Nguyên đán (30 Tết)"));
  });

  it("default holidays = 11 statutory days + the 6 NCC days, sorted by date", () => {
    const actualHolidays = getDefaultHolidays(2026);

    expect(actualHolidays).toHaveLength(17);
    expect(actualHolidays).toEqual(expect.arrayContaining(getStatutoryHolidays(2026)));
    expect(actualHolidays).toEqual(
      expect.arrayContaining([
        { dateValue: "2026-02-14", holidayName: "Valentine", applyHolidayPrice: true },
        { dateValue: "2026-03-08", holidayName: "Quốc tế Phụ nữ", applyHolidayPrice: true },
        { dateValue: "2026-12-24", holidayName: "Giáng sinh", applyHolidayPrice: true }
      ])
    );
    const dates = actualHolidays.map((holiday) => holiday.dateValue);
    expect(dates).toEqual([...dates].sort());
    expect(NCC_HOLIDAYS).toHaveLength(6);
  });

  it("20/10, 31/10, 20/11 are holidays suggested 'Theo ngày trong tuần', never forced to the holiday price (V3.2)", () => {
    const actual = getDefaultHolidays(2027).filter((holiday) =>
      /-(10-20|10-31|11-20)$/.test(holiday.dateValue)
    );

    expect(actual).toEqual([
      { dateValue: "2027-10-20", holidayName: "Phụ nữ Việt Nam", applyHolidayPrice: false },
      { dateValue: "2027-10-31", holidayName: "Halloween", applyHolidayPrice: false },
      { dateValue: "2027-11-20", holidayName: "Nhà giáo Việt Nam", applyHolidayPrice: false }
    ]);
    const suggested = new Map(
      getDefaultHolidays(2026).map((holiday) => [holiday.dateValue, holiday.applyHolidayPrice])
    );
    expect(suggested.get("2026-10-20")).toBe(false);
    expect(suggested.get("2026-12-24")).toBe(true);
    expect(suggested.has("2026-11-24")).toBe(false);
  });

  it("a NCC day falling on a statutory holiday is listed once, with the statutory name", () => {
    // 14/02/2029 là Tết Mùng 2.
    const actualHolidays = getDefaultHolidays(2029);

    expect(actualHolidays).toHaveLength(16);
    expect(actualHolidays.filter((holiday) => holiday.dateValue === "2029-02-14")).toEqual([
      { dateValue: "2029-02-14", holidayName: "Tết Nguyên đán (Mùng 2)", applyHolidayPrice: true }
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

  it("splits the days by their real classification; old backend (rules 404): no price claim, no amount, no U22 column", async () => {
    // Một Thứ 6 xếp Ngày thường và một Thứ 4 xếp Cuối tuần: tab đi theo dữ liệu, không theo thứ.
    const days = buildYear();
    const friday = days.find((item) => isFriday(item.dateValue))!;
    friday.dateTypeId = 1;
    await setupServer(days);
    renderPage();

    await expectTabCounts(days);
    expect(await screen.findByRole("columnheader", { name: "Thao tác" })).toBeInTheDocument();
    // Backend cũ: không có cột giá vé / ưu đãi U22 (không ghi "Chưa xác định" cho mọi ngày), không hiện số tiền.
    expect(screen.queryByRole("columnheader", { name: "Giá vé" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Ưu đãi U22" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Phân loại gốc" })).not.toBeInTheDocument();
    expect(screen.queryByText("Chưa xác định")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Giá ngày lễ|Giá ngày thường|Giá cuối tuần|VNĐ|\d{2}[.,]000/)
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("pricing-schema-alert")).not.toBeInTheDocument();

    openTab(/^Ngày lễ/);
    expect(await screen.findByText("Quốc khánh")).toBeInTheDocument();
    const holidayRow = rowOf(label(HOLIDAY));
    expect(within(holidayRow).queryByText("Không áp dụng")).not.toBeInTheDocument();
  });

  it("marks a day from its row; it moves to Ngày lễ and the U22 warning shows when it has screenings", async () => {
    const target = buildYear().find((item) => classifyDate(item) === "normal")!;
    const state = await setupServer(buildYear(), [target.dateValue]);
    renderPage();

    await chooseDayAction(target.dateValue, "Thiết lập ngày lễ / sự kiện");
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Thiết lập ngày lễ / sự kiện")).toBeInTheDocument();
    expect(
      await within(dialog).findByText(
        "Ngày này đã có suất chiếu. Sau khi lưu, vé chưa bán của các suất này không được áp ưu đãi U22."
      )
    ).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("Tên ngày lễ"), {
      target: { value: "  Ngày thử nghiệm  " }
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Lưu thiết lập" }));

    await waitFor(() =>
      expect(state.days.find((item) => item.dateValue === target.dateValue)?.isHoliday).toBe(true)
    );
    const marked = state.days.find((item) => item.dateValue === target.dateValue)!;
    expect(marked).toMatchObject({ holidayName: "Ngày thử nghiệm", dateTypeId: target.dateTypeId });
    // Backend cũ: không có "Giá vé áp dụng", body chỉ có tên.
    expect(state.markBodies).toEqual([{ holidayName: "Ngày thử nghiệm" }]);
    expect(await screen.findByText("Ngày thử nghiệm")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^Ngày lễ \(2\)/ })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("renames a holiday; Lưu thiết lập stays disabled until the name changes (old backend: name only)", async () => {
    const state = await setupServer();
    renderPage();
    openTab(/^Ngày lễ/);

    await screen.findByText("Quốc khánh");
    await chooseDayAction(HOLIDAY, "Chỉnh sửa ngày lễ");
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Chỉnh sửa ngày lễ")).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("radiogroup", { name: "Giá vé áp dụng" })
    ).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Lưu thiết lập" })).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText("Tên ngày lễ"), {
      target: { value: "Quốc khánh 2/9" }
    });
    await waitFor(() =>
      expect(within(dialog).getByRole("button", { name: "Lưu thiết lập" })).toBeEnabled()
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Lưu thiết lập" }));

    await waitFor(() =>
      expect(state.days.find((item) => item.dateValue === HOLIDAY)?.holidayName).toBe(
        "Quốc khánh 2/9"
      )
    );
    expect(state.markBodies).toEqual([{ holidayName: "Quốc khánh 2/9" }]);
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
      holidays: namesOnly(DEFAULT_HOLIDAYS.filter((holiday) => holiday.dateValue !== adjacent))
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
    expect(state.initializeCalls[0].holidays).toEqual(namesOnly(DEFAULT_HOLIDAYS));
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
      holidays: namesOnly(decemberHolidays)
    });
    await waitFor(() => expect(screen.queryByTestId("partial-year-alert")).not.toBeInTheDocument());
  });

  it("V3.2: 20/10 and 31/10 both stay in Ngày lễ with different prices; U22 is never applied on either", async () => {
    const days = asV32(buildYear());
    const oct20 = days.find((item) => item.dateValue === `${YEAR}-10-20`)!;
    const oct31 = days.find((item) => item.dateValue === `${YEAR}-10-31`)!;
    // Dữ liệu cố định để không phụ thuộc thứ trong năm chạy test (2026: 20/10 Thứ 3, 31/10 Thứ 7).
    Object.assign(oct20, {
      dateTypeId: 1,
      isHoliday: true,
      holidayName: "Phụ nữ Việt Nam",
      applyHolidayPrice: false
    });
    Object.assign(oct31, {
      dateTypeId: 2,
      isHoliday: true,
      holidayName: "Halloween",
      applyHolidayPrice: false
    });
    const excluded = days.find((item) => classifyDate(item) === "normal")!;
    excluded.isPromotionExcluded = true;
    useV32Backend();
    await setupServer(days);
    renderPage();

    expect(await screen.findByRole("columnheader", { name: "Giá vé" })).toBeInTheDocument();
    const excludedRow = await waitFor(() => rowOf(label(excluded.dateValue)));
    // Ngày không áp ưu đãi: ở tab gốc, giữ giá ngày thường, U22 không áp dụng.
    expect(within(excludedRow).getByText("Giá ngày thường")).toBeInTheDocument();
    expect(within(excludedRow).getByText("Không áp dụng")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Ưu đãi U22" })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(CLAIMS_ALL_PROMOTIONS);
    expect(document.body.textContent).not.toMatch(/chưa áp dụng ưu tiên giá lễ/);

    openTab(/^Ngày lễ/);
    await screen.findByText("Phụ nữ Việt Nam");
    const row20 = rowOf("Phụ nữ Việt Nam");
    const row31 = rowOf("Halloween");
    expect(within(row20).getByText("Giá ngày thường")).toBeInTheDocument();
    expect(within(row31).getByText("Giá cuối tuần")).toBeInTheDocument();
    for (const row of [row20, row31]) {
      expect(within(row).getByText("Không áp dụng")).toBeInTheDocument();
      expect(within(row).queryByText("Có thể áp dụng")).not.toBeInTheDocument();
    }
    expect(within(rowOf("Quốc khánh")).getByText("Giá ngày lễ")).toBeInTheDocument();
  });

  it("Chỉnh sửa ngày lễ: the stored price is preselected; Theo giá ngày trong tuần keeps the day a holiday without U22", async () => {
    const days = asV32(buildYear());
    const holiday = days.find((item) => item.dateValue === HOLIDAY)!;
    const weekdayPrice = holiday.dateTypeId === 2 ? "Giá cuối tuần" : "Giá ngày thường";
    useV32Backend();
    const state = await setupServer(days, [HOLIDAY]);
    renderPage(true, true);
    openTab(/^Ngày lễ/);

    await screen.findByText("Quốc khánh");
    expect(within(rowOf("Quốc khánh")).getByText("Giá ngày lễ")).toBeInTheDocument();
    await chooseDayAction(HOLIDAY, "Chỉnh sửa ngày lễ");
    const dialog = await screen.findByRole("dialog");
    const radios = within(dialog).getByRole("radiogroup", { name: "Giá vé áp dụng" });
    expect(
      within(radios)
        .getAllByRole("radio")
        .map((radio) => radio.closest("label")?.textContent)
    ).toEqual(["Giá ngày lễ", "Theo giá ngày trong tuần"]);
    expect(within(radios).getByRole("radio", { name: "Giá ngày lễ" })).toBeChecked();
    const result = within(dialog).getByTestId("holiday-result-box");
    expect(result).toHaveTextContent("Giá vé: Giá ngày lễ");
    expect(result).toHaveTextContent("Ưu đãi U22: Không áp dụng");
    expect(
      within(dialog).getByText("Các suất chiếu đã lập giữ nguyên giá hiện tại.")
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Lưu thiết lập" })).toBeDisabled();

    fireEvent.click(within(radios).getByRole("radio", { name: "Theo giá ngày trong tuần" }));
    await waitFor(() => expect(result).toHaveTextContent(`Giá vé: ${weekdayPrice}`));
    expect(result).toHaveTextContent("Ưu đãi U22: Không áp dụng");
    fireEvent.click(within(dialog).getByRole("button", { name: "Lưu thiết lập" }));

    await waitFor(() =>
      expect(state.markBodies).toEqual([{ holidayName: "Quốc khánh", applyHolidayPrice: false }])
    );
    // Không đổi DateTypeId hay cờ không áp ưu đãi; vẫn là ngày lễ.
    expect(state.days.find((item) => item.dateValue === HOLIDAY)).toMatchObject({
      isHoliday: true,
      applyHolidayPrice: false,
      dateTypeId: holiday.dateTypeId,
      isPromotionExcluded: false
    });
    expect((await screen.findAllByText(DAY_SAVED_MESSAGE)).length).toBeGreaterThan(0);
    await waitFor(() =>
      expect(within(rowOf("Quốc khánh")).getByText(weekdayPrice)).toBeInTheDocument()
    );
    expect(within(rowOf("Quốc khánh")).getByText("Không áp dụng")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^Ngày lễ/ })).toHaveAttribute("aria-selected", "true");
  });

  it("renaming a weekday-priced holiday keeps its stored price choice (Theo giá ngày trong tuần is sent again)", async () => {
    const days = asV32(buildYear());
    Object.assign(days.find((item) => item.dateValue === HOLIDAY)!, { applyHolidayPrice: false });
    useV32Backend();
    const state = await setupServer(days);
    renderPage();
    openTab(/^Ngày lễ/);

    await screen.findByText("Quốc khánh");
    await chooseDayAction(HOLIDAY, "Chỉnh sửa ngày lễ");
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("radio", { name: "Theo giá ngày trong tuần" })).toBeChecked();
    fireEvent.change(within(dialog).getByLabelText("Tên ngày lễ"), {
      target: { value: "Quốc khánh 2/9" }
    });
    await waitFor(() =>
      expect(within(dialog).getByRole("button", { name: "Lưu thiết lập" })).toBeEnabled()
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Lưu thiết lập" }));

    await waitFor(() =>
      expect(state.markBodies).toEqual([
        { holidayName: "Quốc khánh 2/9", applyHolidayPrice: false }
      ])
    );
  });

  it("Thiết lập ngày lễ / sự kiện on 20/10: Giá ngày lễ is the default; Theo giá ngày trong tuần is an explicit choice", async () => {
    // Chỉ dữ liệu tháng 10 để 20/10 nằm ở trang đầu của tab gốc.
    const days = asV32(buildYear()).filter((item) => item.dateValue.startsWith(`${YEAR}-10-`));
    const oct20 = `${YEAR}-10-20`;
    useV32Backend();
    const state = await setupServer(days);
    renderPage();

    const baseTab = classifyDate(days.find((item) => item.dateValue === oct20)!);
    if (baseTab === "weekend") openTab(/^Cuối tuần/);
    await chooseDayAction(oct20, "Thiết lập ngày lễ / sự kiện");
    const dialog = await screen.findByRole("dialog");
    const radios = within(dialog).getByRole("radiogroup", { name: "Giá vé áp dụng" });
    expect(within(radios).getByRole("radio", { name: "Giá ngày lễ" })).toBeChecked();
    expect(within(dialog).getByTestId("holiday-result-box")).toHaveTextContent(
      "Giá vé: Giá ngày lễ"
    );
    fireEvent.change(within(dialog).getByLabelText("Tên ngày lễ"), {
      target: { value: "Phụ nữ Việt Nam" }
    });
    fireEvent.click(within(radios).getByRole("radio", { name: "Theo giá ngày trong tuần" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Lưu thiết lập" }));

    await waitFor(() =>
      expect(state.markBodies).toEqual([
        { holidayName: "Phụ nữ Việt Nam", applyHolidayPrice: false }
      ])
    );
  });

  it("Thêm ngày lễ keeps the default Giá ngày lễ when nothing else is chosen (applyHolidayPrice true is sent)", async () => {
    const days = asV32(buildYear()).filter((item) => item.dateValue.startsWith(`${YEAR}-10-`));
    const oct20 = `${YEAR}-10-20`;
    useV32Backend();
    const state = await setupServer(days);
    renderPage();

    const baseTab = classifyDate(days.find((item) => item.dateValue === oct20)!);
    if (baseTab === "weekend") openTab(/^Cuối tuần/);
    await chooseDayAction(oct20, "Thiết lập ngày lễ / sự kiện");
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Tên ngày lễ"), {
      target: { value: "Sự kiện QA" }
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Lưu thiết lập" }));

    await waitFor(() =>
      expect(state.markBodies).toEqual([{ holidayName: "Sự kiện QA", applyHolidayPrice: true }])
    );
  });

  it("Không áp dụng U22 on a weekday: keeps its price and tab, PUTs the flag; then Cho phép xét U22 is offered", async () => {
    const days = asV32(buildYear());
    const target = days.find((item) => classifyDate(item) === "normal")!;
    useV32Backend();
    const state = await setupServer(days, [target.dateValue]);
    renderPage();

    await waitFor(() => expect(rowOf(label(target.dateValue))).toBeInTheDocument());
    expect(within(rowOf(label(target.dateValue))).getByText("Có thể áp dụng")).toBeInTheDocument();
    await chooseDayAction(target.dateValue, "Không áp dụng U22");
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByTestId("promotion-exclusion-summary")).toHaveTextContent(
      "Giá vé: Giữ giá ngày thường"
    );
    expect(within(dialog).getByTestId("promotion-exclusion-summary")).toHaveTextContent(
      "Ưu đãi U22: Không áp dụng"
    );
    expect(
      within(dialog).getByText(
        "Không thay đổi giá các suất đã lưu và các chương trình ưu đãi khác."
      )
    ).toBeInTheDocument();
    expect(
      await within(dialog).findByText(
        "Ngày này đã có suất chiếu: vé bán sau khi lưu không được áp ưu đãi U22."
      )
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(CLAIMS_ALL_PROMOTIONS);
    fireEvent.click(within(dialog).getByRole("button", { name: "Xác nhận" }));

    await waitFor(() =>
      expect(state.exclusionCalls).toEqual([{ dateValue: target.dateValue, excluded: true }])
    );
    expect(state.days.find((item) => item.dateValue === target.dateValue)).toMatchObject({
      isHoliday: false,
      isPromotionExcluded: true,
      dateTypeId: target.dateTypeId
    });
    await waitFor(() =>
      expect(within(rowOf(label(target.dateValue))).getByText("Không áp dụng")).toBeInTheDocument()
    );
    expect(within(rowOf(label(target.dateValue))).getByText("Giá ngày thường")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^Ngày thường/ })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(menuLabels(await openDayMenu(target.dateValue))).toEqual([
      "Thiết lập ngày lễ / sự kiện",
      "Cho phép xét U22"
    ]);
  });

  it("holiday menu: Chỉnh sửa ngày lễ / Đối chiếu giá suất chiếu / Bỏ đánh dấu ngày lễ; no Xem chi tiết; Đối chiếu locked on a past day", async () => {
    const days = asV32(buildYear());
    for (const [dateValue, holidayName] of [
      [FUTURE_DAY, "Tất niên QA"],
      [PAST_DAY, "Tết Dương lịch"]
    ]) {
      Object.assign(days.find((item) => item.dateValue === dateValue)!, {
        isHoliday: true,
        holidayName,
        applyHolidayPrice: true
      });
    }
    useV32Backend();
    await setupServer(days);
    renderPage(true, true);
    openTab(/^Ngày lễ/);
    await screen.findByText("Quốc khánh");

    const futureMenu = await openDayMenu(FUTURE_DAY);
    expect(menuLabels(futureMenu)).toEqual([
      "Chỉnh sửa ngày lễ",
      "Đối chiếu giá suất chiếu",
      "Bỏ đánh dấu ngày lễ"
    ]);
    expect(
      within(futureMenu).getByRole("menuitem", { name: "Đối chiếu giá suất chiếu" })
    ).not.toHaveAttribute("aria-disabled", "true");
    expect(document.body.textContent).not.toMatch(
      /Xem chi tiết|Chi tiết ngày|Kiểm tra giá suất chiếu/
    );
    if (IS_PAST_DAY_PAST) {
      const pastMenu = await openDayMenu(PAST_DAY);
      expect(
        within(pastMenu).getByRole("menuitem", { name: "Đối chiếu giá suất chiếu" })
      ).toHaveAttribute("aria-disabled", "true");
    }
  });

  it("without plan_cinema.view the holiday menu has no Đối chiếu giá suất chiếu", async () => {
    useV32Backend();
    await setupServer(asV32(buildYear()));
    renderPage(true, false);
    openTab(/^Ngày lễ/);

    await screen.findByText("Quốc khánh");
    expect(menuLabels(await openDayMenu(HOLIDAY))).toEqual([
      "Chỉnh sửa ngày lễ",
      "Bỏ đánh dấu ngày lễ"
    ]);
  });

  it(
    "DB without the V3.2 schema: compatibility error, price mode cannot be saved, no new actions",
    { timeout: 90000 },
    async () => {
      useV32Backend(SCHEMA_NOT_READY_RULES);
      const state = await setupServer(asV32(buildYear()));
      renderPage();

      expect(await screen.findByTestId("pricing-schema-alert")).toHaveTextContent(
        "Cơ sở dữ liệu chưa được cập nhật cấu trúc V3.2. Liên hệ quản trị hệ thống."
      );
      expect(screen.getByTestId("pricing-schema-alert")).toHaveTextContent(
        "giá vé áp dụng của ngày lễ"
      );
      const target = state.days.find((item) => classifyDate(item) === "normal")!;
      fireEvent.click(
        await screen.findByRole("button", { name: `Thao tác ngày ${label(target.dateValue)}` })
      );
      const menu = await waitFor(() => {
        const menus = document.querySelectorAll<HTMLElement>(
          ".ant-dropdown:not(.ant-dropdown-hidden) [role='menu']"
        );
        if (!menus.length) throw new Error("Menu thao tác chưa mở");
        return menus[menus.length - 1];
      });
      // Không có thao tác V3.2 mới (Không áp dụng U22 / Cho phép xét U22) khi DB chưa đủ cấu trúc.
      expect(menuLabels(menu)).toEqual(["Thiết lập ngày lễ / sự kiện"]);

      openTab(/^Ngày lễ/);
      await screen.findByText("Quốc khánh");
      await chooseDayAction(HOLIDAY, "Chỉnh sửa ngày lễ");
      const dialog = await screen.findByRole("dialog");
      const radios = within(dialog).getByRole("radiogroup", { name: "Giá vé áp dụng" });
      within(radios)
        .getAllByRole("radio")
        .forEach((radio) => expect(radio).toBeDisabled());
      expect(
        within(dialog).getByText(
          "Cơ sở dữ liệu chưa được cập nhật cấu trúc V3.2. Liên hệ quản trị hệ thống."
        )
      ).toBeInTheDocument();
      expect(
        within(dialog).getByText("Chưa lưu được giá vé áp dụng; chỉ đổi được tên ngày lễ.")
      ).toBeInTheDocument();
      fireEvent.change(within(dialog).getByLabelText("Tên ngày lễ"), {
        target: { value: "Quốc khánh 2/9" }
      });
      await waitFor(() =>
        expect(within(dialog).getByRole("button", { name: "Lưu thiết lập" })).toBeEnabled()
      );
      fireEvent.click(within(dialog).getByRole("button", { name: "Lưu thiết lập" }));
      // Chỉ đổi tên: không gửi "Giá vé áp dụng".
      await waitFor(() => expect(state.markBodies).toEqual([{ holidayName: "Quốc khánh 2/9" }]));
    }
  );

  it("503 HOLIDAY_PRICE_MODE_SCHEMA_MISSING when saving: compatibility error, never a success", async () => {
    useV32Backend();
    await setupServer(asV32(buildYear()));
    server.use(
      http.put(`${API}/api/pos/date-in-year/:dateValue/holiday`, () =>
        HttpResponse.json(
          { statusCode: 503, code: "HOLIDAY_PRICE_MODE_SCHEMA_MISSING", message: "missing" },
          { status: 503 }
        )
      )
    );
    renderPage();
    openTab(/^Ngày lễ/);

    await screen.findByText("Quốc khánh");
    await chooseDayAction(HOLIDAY, "Chỉnh sửa ngày lễ");
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("radio", { name: "Theo giá ngày trong tuần" }));
    await waitFor(() =>
      expect(within(dialog).getByRole("button", { name: "Lưu thiết lập" })).toBeEnabled()
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Lưu thiết lập" }));

    expect(
      await within(dialog).findByText(
        /Cơ sở dữ liệu chưa được cập nhật cấu trúc V3\.2.*Ngày lễ chưa được lưu\./
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(DAY_SAVED_MESSAGE)).not.toBeInTheDocument();
  });

  it("unmarking a holiday that is also promotion-excluded says U22 stays blocked and the new price basis", async () => {
    const days = asV32(buildYear());
    days.find((item) => item.dateValue === HOLIDAY)!.isPromotionExcluded = true;
    useV32Backend();
    const state = await setupServer(days);
    renderPage();
    openTab(/^Ngày lễ/);

    await screen.findByText("Quốc khánh");
    await chooseDayAction(HOLIDAY, "Bỏ đánh dấu ngày lễ");
    await waitFor(() =>
      expect(screen.getAllByText(`Bỏ đánh dấu ngày lễ ${label(HOLIDAY)}?`).length).toBeGreaterThan(
        0
      )
    );
    const confirm = lastDialog();
    expect(
      within(confirm).getByText(
        "Ưu đãi U22 vẫn không áp dụng vì ngày đang được đánh dấu không áp dụng U22."
      )
    ).toBeInTheDocument();
    expect(within(confirm).getByText(/Giá tra mới theo phân loại gốc/)).toBeInTheDocument();
    expect(within(confirm).getByText("Các suất đã lưu giữ nguyên giá.")).toBeInTheDocument();
    fireEvent.click(within(confirm).getByRole("button", { name: "Bỏ đánh dấu" }));

    await waitFor(() =>
      expect(state.days.find((item) => item.dateValue === HOLIDAY)).toMatchObject({
        isHoliday: false,
        isPromotionExcluded: true
      })
    );
  });

  it("old backend (rules 404): no promotion-exclusion action, no price or U22 column", async () => {
    const days = buildYear();
    const target = days.find((item) => classifyDate(item) === "normal")!;
    await setupServer(days);
    renderPage();

    expect(menuLabels(await openDayMenu(target.dateValue))).toEqual([
      "Thiết lập ngày lễ / sự kiện"
    ]);
    expect(screen.queryByRole("columnheader", { name: "Giá vé" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Ưu đãi U22" })).not.toBeInTheDocument();
  });

  it("Khởi tạo năm (V3.2): 17 default holidays with their price mode; 20/10, 31/10, 20/11 by weekday", async () => {
    useV32Backend();
    const state = await setupServer([]);
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", { name: `Khởi tạo năm ${YEAR}` }, { timeout: 10000 })
    );
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getAllByRole("checkbox")).toHaveLength(DEFAULT_HOLIDAYS.length);
    expect(within(dialog).getByLabelText(`Giá vé áp dụng 20/10`)).toBeInTheDocument();
    expect(within(dialog).getByTestId("initialize-year-summary")).toHaveTextContent(
      "(3 ngày theo giá trong tuần)"
    );
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /Halloween/ }));
    expect(within(dialog).getByTestId("initialize-year-summary")).toHaveTextContent(
      "(2 ngày theo giá trong tuần)"
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Khởi tạo" }));

    await waitFor(() => expect(state.initializeCalls).toHaveLength(1));
    expect(state.initializeCalls[0]).toEqual({
      year: YEAR,
      weekendDays: [5, 6, 0],
      holidays: DEFAULT_HOLIDAYS.filter((holiday) => holiday.holidayName !== "Halloween")
    });
    const byWeekday = state.initializeCalls[0].holidays
      .filter((holiday) => holiday.applyHolidayPrice === false)
      .map((holiday) => holiday.dateValue.slice(5));
    expect(byWeekday).toEqual(["10-20", "11-20"]);
  });

  it("Đối chiếu giá suất chiếu opens the read-only check of that (future) holiday", async () => {
    const days = asV32(buildYear());
    Object.assign(days.find((item) => item.dateValue === FUTURE_DAY)!, {
      isHoliday: true,
      holidayName: "Tất niên QA",
      applyHolidayPrice: true
    });
    useV32Backend();
    await setupServer(days);
    const previewBodies: unknown[] = [];
    server.use(
      http.post(`${API}/api/pos/plan-screenings/repricing/preview`, async ({ request }) => {
        previewBodies.push(await request.json());
        return HttpResponse.json({
          generatedAt: new Date().toISOString(),
          includePast: false,
          total: 0,
          summary: { total: 0, matching: 0, differing: 0, unavailable: 0, past: 0 },
          items: []
        });
      })
    );
    renderPage(true, true);
    openTab(/^Ngày lễ/);

    await screen.findByText("Tất niên QA");
    await chooseDayAction(FUTURE_DAY, "Đối chiếu giá suất chiếu");
    expect(
      await screen.findByText(
        "So sánh giá đã lưu với cấu hình giá hiện tại. Không thay đổi dữ liệu."
      )
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(previewBodies).toEqual([
        { fromDate: FUTURE_DAY, toDate: FUTURE_DAY, includePast: false }
      ])
    );
    expect(await screen.findByText("Ngày này chưa có suất chiếu.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Áp dụng/ })).not.toBeInTheDocument();
  });

  it("hides every write action without holidays.update", async () => {
    await setupServer();
    renderPage(false);

    expect(await screen.findByRole("tab", { name: /^Ngày thường/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Thêm ngày lễ/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Thiết lập phân loại ngày/ })
    ).not.toBeInTheDocument();
    const target = buildYear().find((item) => classifyDate(item) === "normal")!;
    await waitFor(() => expect(rowOf(label(target.dateValue))).toBeInTheDocument());
    // Không còn thao tác nào (dialog Chi tiết ngày đã bỏ): không hiện nút menu rỗng.
    expect(
      screen.queryByRole("button", { name: `Thao tác ngày ${label(target.dateValue)}` })
    ).not.toBeInTheDocument();
  });

  it("QA-V32: price rules unknown (server error): Khởi tạo năm is blocked, no holiday is sent without its price choice", async () => {
    const state = await setupServer([]);
    server.use(
      http.get(`${API}/api/pos/pricing/rules`, () =>
        HttpResponse.json({ message: "boom" }, { status: 500 })
      )
    );
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", { name: `Khởi tạo năm ${YEAR}` }, { timeout: 10000 })
    );
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText("Chưa tải được cấu hình giá vé từ máy chủ")
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Khởi tạo" })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Khởi tạo" }));
    expect(state.initializeCalls).toEqual([]);
  });

  it("QA-V32: price rules unknown: default holidays cannot be marked from Thiết lập phân loại ngày", async () => {
    const state = await setupServer(buildYear(false));
    server.use(
      http.get(`${API}/api/pos/pricing/rules`, () =>
        HttpResponse.json({ message: "boom" }, { status: 500 })
      )
    );
    renderPage();
    const [picked] = DEFAULT_HOLIDAYS.filter((holiday) => holiday.dateValue !== HOLIDAY);

    const dialog = await openClassificationDialog();
    const line = within(dialog).getByTestId("default-holiday-line");
    fireEvent.click(
      within(line).getByRole("checkbox", {
        name: new RegExp(picked.holidayName.replace(/[()]/g, "."))
      })
    );

    expect(await within(dialog).findByTestId("holiday-mark-blocked")).toHaveTextContent(
      "Chưa tải được cấu hình giá vé từ máy chủ"
    );
    expect(within(dialog).getByRole("button", { name: /Lưu thiết lập/ })).toBeDisabled();
    expect(state.marked).toEqual([]);
  });

  it("QA-V32: V3.2 backend: default holidays marked from Thiết lập phân loại ngày carry their price choice (20/10 by weekday)", async () => {
    useV32Backend();
    const state = await setupServer(asV32(buildYear(false)));
    renderPage();
    const women = DEFAULT_HOLIDAYS.find((holiday) => holiday.dateValue.endsWith("-10-20"))!;
    const labour = DEFAULT_HOLIDAYS.find((holiday) => holiday.dateValue.endsWith("-05-01"))!;
    expect(await screen.findByRole("columnheader", { name: "Giá vé" })).toBeInTheDocument();

    const dialog = await openClassificationDialog();
    const line = within(dialog).getByTestId("default-holiday-line");
    for (const holiday of [labour, women]) {
      fireEvent.click(
        within(line).getByRole("checkbox", { name: new RegExp(holiday.holidayName) })
      );
    }
    expect(within(dialog).queryByTestId("holiday-mark-blocked")).not.toBeInTheDocument();
    await confirmSave(dialog);

    await waitFor(() => expect(state.markBodies).toHaveLength(2));
    expect(state.markBodies).toEqual(
      expect.arrayContaining([
        { holidayName: labour.holidayName, applyHolidayPrice: true },
        { holidayName: women.holidayName, applyHolidayPrice: false }
      ])
    );
  });

  it("QA-V32: month filter narrows every tab to that month (Tháng 9: only Quốc khánh in Ngày lễ)", async () => {
    const days = asV32(buildYear());
    useV32Backend();
    await setupServer(days);
    renderPage();

    await expectTabCounts(days);
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Tháng" }));
    fireEvent.click(await screen.findByTitle("Tháng 9"));

    await expectTabCounts(days.filter((item) => dayjs(item.dateValue).month() === 8));
    openTab(/^Ngày lễ/);
    expect(await screen.findByText("Quốc khánh")).toBeInTheDocument();
  });

  it("QA-V32: the day list failing to load shows an error with Thử lại, never an empty year", async () => {
    await setupServer();
    let calls = 0;
    server.use(
      http.get(`${API}/api/pos/date-in-year`, () => {
        calls += 1;
        return HttpResponse.json({ message: "Lỗi máy chủ" }, { status: 500 });
      })
    );
    renderPage();

    expect(
      await screen.findByText("Không tải được danh sách ngày", undefined, { timeout: 15000 })
    ).toBeInTheDocument();
    expect(screen.queryByText(`Năm ${YEAR} chưa có dữ liệu ngày`)).not.toBeInTheDocument();
    const before = calls;
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(calls).toBeGreaterThan(before));
  });
});
