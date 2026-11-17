/**
 * E2E V3.2 (giá vé ngày lễ theo từng ngày, U22 theo suất): Electron → NestJS local → `CinemaTicketDev` (DEV).
 *
 * Opt-in, chỉ chạy với backend loopback (scripts/dev/run-local.js của ncc-online-be-nestjs, mọi API ngoài bị
 * external-blocker chặn). Thao tác thật trên UI: Danh sách ngày (3 tab, Giá vé, Ưu đãi U22, Chỉnh sửa / Thiết lập /
 * Bỏ đánh dấu ngày lễ, Không áp dụng U22, Khởi tạo năm), Giờ chiếu (cột Ưu đãi U22, Thêm ca chiếu mới),
 * Đối chiếu giá suất chiếu (kể cả lỗi API + Thử lại) và POS (thông báo U22 mới, bán U22 tiền mặt, hủy vé).
 * Máy in là IPC giả. Đơn bán luôn bật "Xuất hóa đơn" nên không vào hàng đợi hóa đơn điện tử.
 *
 * Env: E2E_V32_API_BASE (http://127.0.0.1:<port>), E2E_V32_USERNAME / E2E_V32_PASSWORD (quyền holidays.update,
 *      plan_cinema.update / view), E2E_V32_CONFIG (đường dẫn JSON ngoài repo, xem `V32Config`).
 * Dữ liệu QA (suất, ngày, thẻ) do người chạy chuẩn bị trên DEV; test trả các ngày về trạng thái ban đầu, ngoại trừ
 * năm khởi tạo (`initYear`) và suất tạo qua UI: Id được ghi vào `test-results/holiday-pricing-v32.created.json` để dọn.
 */
import {
  _electron as electron,
  expect,
  test,
  type ElectronApplication,
  type Locator,
  type Page
} from "@playwright/test";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

type V32Config = {
  planName: string;
  screenings: Record<"S1" | "S2" | "S3" | "S4" | "S6" | "S9", number>;
  dates: { N1: string; N3: string; NH: string; UI: string };
  cards: { A: string };
  film2DName: string;
  film3DName: string;
  roomName: string;
  initYear: number;
};

const API_BASE = process.env.E2E_V32_API_BASE || "";
const ACCOUNT = { username: process.env.E2E_V32_USERNAME, password: process.env.E2E_V32_PASSWORD };
const CONFIG_PATH = process.env.E2E_V32_CONFIG || "";
const FAKE_PRINTER = "QA-V32-FAKE-PRINTER";
const CREATED_FILE = path.join("test-results", "holiday-pricing-v32.created.json");

const isConfigured =
  /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(API_BASE) &&
  Boolean(ACCOUNT.username && ACCOUNT.password && CONFIG_PATH);

test.skip(!isConfigured, "Chỉ chạy khi cấu hình backend local (E2E_V32_*)");
test.describe.configure({ mode: "serial" });

// ---------- API thật (đối chiếu, dọn) ----------
let token = "";
const apiCall = async <T>(method: string, url: string, body?: unknown) => {
  const response = await fetch(`${API_BASE}${url}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  return { status: response.status, body: (text ? JSON.parse(text) : null) as T };
};
type DayRow = {
  dateValue: string;
  isHoliday: boolean;
  applyHolidayPrice: boolean | null;
  isPromotionExcluded: boolean | null;
};
const getDay = async (date: string) => {
  const filter = encodeURIComponent(JSON.stringify({ dateValue: { eq: date } }));
  const answer = await apiCall<{ data: DayRow[] }>(
    "GET",
    `/api/pos/date-in-year?current=1&pageSize=5&filter=${filter}`
  );
  return answer.body.data.find((day) => day.dateValue.slice(0, 10) === date);
};
type Seat = { seat: string; code: string; status: number; price: number; isHold?: number };
const findFreeSeat = async (screenId: number, minRow = 6) => {
  const answer = await apiCall<{ listSeats: Seat[][] }>(
    "GET",
    `/api/pos/plan-screenings/${screenId}`
  );
  const seats = answer.body.listSeats
    .flat()
    .filter((seat) => seat.status === 0 && !seat.isHold && seat.price > 70000 && seat.code);
  const seat = seats.find((item) => Number(item.seat.slice(1).split(":")[0]) >= minRow) ?? seats[0];
  if (!seat) throw new Error(`No free seat on ${screenId}`);
  return seat;
};
const created: { screenings: number[]; orders: number[]; initYear?: number } = {
  screenings: [],
  orders: []
};
const saveCreated = async () => {
  await mkdir(path.dirname(CREATED_FILE), { recursive: true });
  await writeFile(CREATED_FILE, JSON.stringify(created, null, 1));
};

// ---------- Electron ----------
type Session = { app: ElectronApplication; page: Page };
const launch = async (): Promise<Session> => {
  const profileDir = await mkdtemp(path.join(os.tmpdir(), "v32-e2e-"));
  // Profile riêng: config.json trỏ backend local, không đụng cấu hình máy thật.
  await writeFile(
    path.join(profileDir, "config.json"),
    JSON.stringify({
      apiBaseUrl: API_BASE,
      socketUrl: API_BASE.replace(/^http/, "ws"),
      theme: "light"
    })
  );
  const env = { ...process.env } as Record<string, string>;
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({
    args: [
      `--user-data-dir=${profileDir}`,
      "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost",
      "."
    ],
    cwd: process.cwd(),
    env
  });
  const page = await app.firstWindow();
  await app.evaluate(({ BrowserWindow, ipcMain }, printer) => {
    const window = BrowserWindow.getAllWindows()[0];
    window.setKiosk(false);
    window.setFullScreen(false);
    window.setBounds({ x: 0, y: 0, width: 1700, height: 1000 });
    const state = globalThis as unknown as { qaPrints: unknown[] };
    state.qaPrints = [];
    ipcMain.removeHandler("print-tickets");
    ipcMain.handle("print-tickets", (_event, tickets: unknown[]) => {
      state.qaPrints.push(tickets);
      return true;
    });
    ipcMain.removeHandler("get-printers");
    ipcMain.handle("get-printers", () => [
      {
        name: printer,
        displayName: printer,
        description: "QA",
        status: 0,
        isDefault: true,
        options: {}
      }
    ]);
  }, FAKE_PRINTER);
  // Không để app gọi ra ngoài: chỉ backend local.
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (/^https?:$/.test(url.protocol) && url.origin !== API_BASE) return route.abort();
    return route.continue();
  });
  await page.evaluate((printer) => {
    localStorage.setItem(
      "pos-settings",
      JSON.stringify({ state: { posName: "QA V32 E2E", posShortName: "QAV32" }, version: 0 })
    );
    localStorage.setItem(
      "printer-storage",
      JSON.stringify({
        state: { printers: [], selectedPrinter: printer, loading: false },
        version: 0
      })
    );
  }, FAKE_PRINTER);
  await page.reload();
  return { app, page };
};
const quit = (session?: Session) =>
  session?.app.evaluate(({ app }) => app.exit(0)).catch(() => undefined);

const login = async (page: Page) => {
  await expect(page.getByRole("heading", { name: "Chào mừng trở lại" })).toBeVisible({
    timeout: 60000
  });
  await page.getByLabel("Tên đăng nhập").fill(ACCOUNT.username!);
  await page.getByLabel("Mật khẩu").fill(ACCOUNT.password!);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).not.toHaveURL(/#\/login/, { timeout: 30000 });
};
const goto = (page: Page, hash: string) =>
  page.evaluate((target) => {
    window.location.hash = target;
  }, hash);
const waitApi = (page: Page, method: string, pattern: RegExp) =>
  page.waitForResponse(
    (response) =>
      response.request().method() === method && pattern.test(new URL(response.url()).pathname),
    { timeout: 30000 }
  );
const toast = (page: Page, text: string | RegExp) =>
  page.locator(".ant-message").getByText(text).last();
const ddmmyyyy = (date: string) => date.split("-").reverse().join("/");
const openMenu = (page: Page) => page.locator(".ant-dropdown:not(.ant-dropdown-hidden)");

// ---------- Danh sách ngày ----------
const pickYear = async (page: Page, year: number) => {
  const picker = page.getByRole("textbox", { name: "Năm" }).or(page.getByLabel("Năm")).first();
  await picker.click();
  await picker.fill(String(year));
  await picker.press("Enter");
};
const openHolidayMonth = async (page: Page, date: string) => {
  await goto(page, "#/holidays");
  const month = page.getByRole("combobox", { name: "Tháng" });
  await expect(month).toBeVisible({ timeout: 20000 });
  // Danh sách tháng là danh sách ảo (13 mục: "Tất cả các tháng", Tháng 1…12) và mở tại tháng đang chọn, phím mũi tên
  // đi vòng: chọn bằng số bước tương đối từ giá trị hiện tại.
  const shown = await page.locator(".ant-select").filter({ has: month }).first().innerText();
  const currentIndex = /Tháng (\d+)/.exec(shown) ? Number(/Tháng (\d+)/.exec(shown)![1]) : 0;
  const targetIndex = Number(date.slice(5, 7));
  await month.click();
  for (let step = 0; step < (targetIndex - currentIndex + 13) % 13; step += 1)
    await month.press("ArrowDown");
  await month.press("Enter");
  await expect(
    page
      .locator(".ant-select")
      .filter({ has: month })
      .getByText(`Tháng ${Number(date.slice(5, 7))}`)
  ).toBeVisible();
};
const tab = (page: Page, label: "Ngày thường" | "Cuối tuần" | "Ngày lễ") =>
  page.getByRole("tab", { name: new RegExp(`^${label} \\(\\d+\\)`) });
const dayRow = (page: Page, date: string) =>
  page.locator("tr.ant-table-row").filter({ hasText: ddmmyyyy(date) });
const openDayMenu = async (page: Page, date: string) => {
  await dayRow(page, date)
    .getByRole("button", { name: `Thao tác ngày ${ddmmyyyy(date)}` })
    .click();
  await expect(openMenu(page)).toBeVisible();
  return openMenu(page);
};
const chooseDayAction = async (page: Page, date: string, action: string) => {
  const menu = await openDayMenu(page, date);
  await menu.getByRole("menuitem", { name: action }).click();
};

// ---------- Giờ chiếu ----------
const openScheduling = async (page: Page, planName: string, date: string) => {
  await goto(page, "#/plan-cinema");
  const schedulingTab = page.getByRole("tab", { name: "Giờ chiếu, phòng chiếu" });
  if (!(await schedulingTab.isVisible().catch(() => false))) {
    // Collapse dạng accordion: chỉ mở panel "Kế hoạch đã duyệt" khi nó đang đóng (bấm lần nữa sẽ đóng lại).
    const plan = page.getByText(planName, { exact: true }).filter({ visible: true });
    if ((await plan.count()) === 0) await page.getByText("Kế hoạch đã duyệt").click();
    await plan.first().click();
  }
  await schedulingTab.click();
  const picker = page.getByPlaceholder("Chọn ngày chiếu").first();
  await picker.click();
  await picker.fill(ddmmyyyy(date));
  await picker.press("Enter");
};
const screeningRow = (page: Page, id: number) => page.locator(`tr[data-row-key="${id}"]`);

// ---------- POS ----------
const openScreening = async (page: Page, id: number, seatCode: string) => {
  await goto(page, `#/plan-screening/${id}`);
  await expect(page.locator(`[data-seat-code="${seatCode}"]`).first()).toBeVisible({
    timeout: 30000
  });
};
const selectSeat = async (page: Page, code: string) => {
  const seat = page.locator(`[data-seat-code="${code}"]`).first();
  if ((await seat.getAttribute("data-seat-selection-state")) !== "confirmed") await seat.click();
  await expect(seat).toHaveAttribute("data-seat-selection-state", "confirmed");
};
const printButton = (page: Page) => page.getByRole("button", { name: /In vé$/ });
const openVipDialog = async (page: Page, card: string) => {
  const vip = page.getByRole("checkbox", { name: "Quẹt thẻ VIP" });
  if (!(await vip.isChecked())) await vip.check();
  await expect(printButton(page)).toBeEnabled({ timeout: 20000 });
  await printButton(page).click();
  const dialog = page.locator(".ant-modal").filter({ has: page.getByPlaceholder("Nhập số thẻ") });
  await expect(dialog).toBeVisible();
  const validated = waitApi(page, "POST", /^\/api\/pos\/order\/validate-voucher$/);
  await dialog.getByPlaceholder("Nhập số thẻ").fill(card);
  await dialog.getByRole("button", { name: "Tìm kiếm" }).click();
  expect((await validated).status()).toBeLessThan(300);
  return dialog;
};
const closeModal = async (page: Page, dialog: Locator) => {
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
};
const U22_RADIO = "Áp dụng ưu đãi cho thành viên U22";
const POLICY_BLOCKED = "Ngày/suất chiếu này không áp dụng ưu đãi U22 theo chính sách NCC.";

test.describe("V3.2 Electron ↔ BE local ↔ CinemaTicketDev", () => {
  let session: Session | undefined;
  let config: V32Config;

  test.beforeAll(async () => {
    config = JSON.parse(await readFile(CONFIG_PATH, "utf8")) as V32Config;
    const answer = await apiCall<{ access_token: string }>("POST", "/api/pos/staff/login", ACCOUNT);
    token = answer.body.access_token;
    const rules = await apiCall<{ ruleVersion: string; ready: boolean }>(
      "GET",
      "/api/pos/pricing/rules"
    );
    expect(rules.body).toMatchObject({ ruleVersion: "holiday-v3.2", ready: true });
    // Trạng thái đầu (chạy lại được): ngày lễ QA dùng Giá ngày lễ; ngày UI là ngày thường, chưa tắt U22.
    const holidayMode = await apiCall(
      "PUT",
      `/api/pos/date-in-year/${config.dates.NH}/holiday-price-mode`,
      {
        applyHolidayPrice: true
      }
    );
    expect(holidayMode.status).toBe(200);
    expect(await getDay(config.dates.UI)).toMatchObject({
      isHoliday: false,
      isPromotionExcluded: false
    });
    session = await launch();
    await login(session.page);
  });

  test.afterAll(async () => {
    await saveCreated().catch(() => undefined);
    await quit(session);
  });

  test("V32-E01 Danh sách ngày tháng 12: 3 tab, cột Giá vé / Ưu đãi U22 theo dữ liệu DEV", async () => {
    const page = session!.page;
    await openHolidayMonth(page, config.dates.N1);
    await expect(page.getByRole("columnheader", { name: "Giá vé" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Ưu đãi U22" })).toBeVisible();
    await expect(tab(page, "Ngày thường")).toBeVisible();
    await expect(tab(page, "Cuối tuần")).toBeVisible();
    await expect(tab(page, "Ngày lễ")).toBeVisible();
    await tab(page, "Ngày thường").click();
    await expect(dayRow(page, config.dates.N1)).toContainText("Giá ngày thường");
    await expect(dayRow(page, config.dates.N1)).toContainText("Có thể áp dụng");
    // Ngày không áp ưu đãi vẫn ở tab gốc, giữ giá ngày thường.
    await expect(dayRow(page, config.dates.N3)).toContainText("Giá ngày thường");
    await expect(dayRow(page, config.dates.N3)).toContainText("Không áp dụng");
    await tab(page, "Ngày lễ").click();
    await expect(dayRow(page, config.dates.NH)).toContainText("Giá ngày lễ");
    await expect(dayRow(page, config.dates.NH)).toContainText("Không áp dụng");
    await expect(dayRow(page, "2026-12-24")).toContainText("Giá ngày thường");
  });

  test("V32-E02 tháng 10: 20/10 ở tab Ngày lễ giá ngày thường; ngày đã qua khóa Đối chiếu; không có Xem chi tiết", async () => {
    const page = session!.page;
    await openHolidayMonth(page, "2026-10-20");
    await tab(page, "Ngày lễ").click();
    await expect(dayRow(page, "2026-10-20")).toContainText("Giá ngày thường");
    await expect(dayRow(page, "2026-10-20")).toContainText("Không áp dụng");
    const menu = await openDayMenu(page, "2026-10-20");
    await expect(menu.getByRole("menuitem", { name: "Chỉnh sửa ngày lễ" })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Bỏ đánh dấu ngày lễ" })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: /Đối chiếu giá suất chiếu/ })).toHaveAttribute(
      "aria-disabled",
      "true"
    );
    await expect(menu.getByText("Xem chi tiết")).toHaveCount(0);
    await page.keyboard.press("Escape");
  });

  test("V32-E03 Chỉnh sửa ngày lễ: radio đúng giá trị đã lưu → Theo giá ngày trong tuần → lối tắt mở Đối chiếu giá", async () => {
    const page = session!.page;
    // Trạng thái đầu của ca: ngày lễ QA đang dùng Giá ngày lễ.
    expect(
      (
        await apiCall("PUT", `/api/pos/date-in-year/${config.dates.NH}/holiday-price-mode`, {
          applyHolidayPrice: true
        })
      ).status
    ).toBe(200);
    await openHolidayMonth(page, config.dates.NH);
    await tab(page, "Ngày lễ").click();
    await chooseDayAction(page, config.dates.NH, "Chỉnh sửa ngày lễ");
    const dialog = page.getByRole("dialog").filter({ hasText: "Chỉnh sửa ngày lễ" });
    await expect(dialog.getByRole("radio", { name: "Giá ngày lễ" })).toBeChecked();
    await dialog.getByRole("radio", { name: "Theo giá ngày trong tuần" }).check();
    await expect(dialog).toContainText("Không áp dụng");
    const saved = waitApi(page, "PUT", /\/api\/pos\/date-in-year\/[\d-]+\/holiday$/);
    await dialog.getByRole("button", { name: "Lưu thiết lập" }).click();
    const response = await saved;
    expect(response.status()).toBe(200);
    expect(response.request().postDataJSON()).toMatchObject({ applyHolidayPrice: false });
    expect((await getDay(config.dates.NH))?.applyHolidayPrice).toBe(false);
    await expect(dayRow(page, config.dates.NH)).toContainText("Giá ngày thường");
    // Ngày có suất + giá cấu hình đổi → thông báo có lối tắt "Đối chiếu giá suất chiếu".
    const previewed = waitApi(page, "POST", /\/api\/pos\/plan-screenings\/repricing\/preview$/);
    await page
      .locator(".ant-message")
      .getByRole("button", { name: "Đối chiếu giá suất chiếu" })
      .click();
    expect((await previewed).status()).toBe(200);
    const repricing = page.getByRole("dialog").filter({ hasText: "Đối chiếu giá suất chiếu" });
    await expect(repricing.getByText("Tổng suất chiếu")).toBeVisible();
    await expect(repricing.getByText("Giá trùng khớp", { exact: true }).first()).toBeVisible();
    await expect(repricing.getByText("Có chênh lệch", { exact: true }).first()).toBeVisible();
    await expect(repricing).toContainText("Không thay đổi dữ liệu");
    await expect(repricing.getByRole("button", { name: /Áp dụng/ })).toHaveCount(0);
    await repricing.getByRole("button", { name: "Đóng" }).click();
    // Trả lại "Giá ngày lễ".
    await chooseDayAction(page, config.dates.NH, "Chỉnh sửa ngày lễ");
    const again = page.getByRole("dialog").filter({ hasText: "Chỉnh sửa ngày lễ" });
    await expect(again.getByRole("radio", { name: "Theo giá ngày trong tuần" })).toBeChecked();
    await again.getByRole("radio", { name: "Giá ngày lễ" }).check();
    const restored = waitApi(page, "PUT", /\/api\/pos\/date-in-year\/[\d-]+\/holiday$/);
    await again.getByRole("button", { name: "Lưu thiết lập" }).click();
    expect((await restored).status()).toBe(200);
    expect((await getDay(config.dates.NH))?.applyHolidayPrice).toBe(true);
  });

  test("V32-E04 Thiết lập ngày lễ mới: mặc định Giá ngày lễ → sang tab Ngày lễ → sửa theo tuần → Bỏ đánh dấu", async () => {
    const page = session!.page;
    const date = config.dates.UI;
    const before = await getDay(date);
    expect(before).toMatchObject({ isHoliday: false });
    await openHolidayMonth(page, date);
    await tab(page, "Ngày thường").click();
    await chooseDayAction(page, date, "Thiết lập ngày lễ / sự kiện");
    const dialog = page.getByRole("dialog").filter({ hasText: "Thiết lập ngày lễ / sự kiện" });
    await expect(dialog.getByRole("radio", { name: "Giá ngày lễ" })).toBeChecked();
    await dialog.getByLabel("Tên ngày lễ").fill("QA V3.2 lễ qua UI");
    const marked = waitApi(page, "PUT", /\/api\/pos\/date-in-year\/[\d-]+\/holiday$/);
    await dialog.getByRole("button", { name: "Lưu thiết lập" }).click();
    const response = await marked;
    expect(response.status()).toBe(200);
    expect(response.request().postDataJSON()).toMatchObject({ applyHolidayPrice: true });
    await expect(tab(page, "Ngày lễ")).toHaveAttribute("aria-selected", "true");
    await expect(dayRow(page, date)).toContainText("Giá ngày lễ");
    expect(await getDay(date)).toMatchObject({ isHoliday: true, applyHolidayPrice: true });
    // Đưa ApplyHolidayPrice về giá trị ban đầu trước khi bỏ đánh dấu (cột vẫn giữ giá trị sau khi bỏ lễ).
    await chooseDayAction(page, date, "Chỉnh sửa ngày lễ");
    const edit = page.getByRole("dialog").filter({ hasText: "Chỉnh sửa ngày lễ" });
    await edit
      .getByRole("radio", {
        name: before?.applyHolidayPrice ? "Giá ngày lễ" : "Theo giá ngày trong tuần"
      })
      .check();
    const edited = waitApi(page, "PUT", /\/api\/pos\/date-in-year\/[\d-]+\/holiday$/);
    await edit.getByRole("button", { name: "Lưu thiết lập" }).click();
    expect((await edited).status()).toBe(200);
    await chooseDayAction(page, date, "Bỏ đánh dấu ngày lễ");
    const unmarked = waitApi(page, "DELETE", /\/api\/pos\/date-in-year\/[\d-]+\/holiday$/);
    await page.locator(".ant-modal-confirm").getByRole("button", { name: "Bỏ đánh dấu" }).click();
    expect((await unmarked).status()).toBe(200);
    expect(await getDay(date)).toMatchObject({
      isHoliday: false,
      applyHolidayPrice: before?.applyHolidayPrice
    });
  });

  test("V32-E05 Không áp dụng U22 (giữ giá, giữ tab) rồi Cho phép xét U22", async () => {
    const page = session!.page;
    const date = config.dates.UI;
    await openHolidayMonth(page, date);
    await tab(page, "Ngày thường").click();
    await chooseDayAction(page, date, "Không áp dụng U22");
    const dialog = page.getByRole("dialog").filter({ hasText: "Không áp dụng U22" });
    await expect(dialog).toContainText("Giữ giá ngày thường");
    const saved = waitApi(page, "PUT", /\/api\/pos\/date-in-year\/[\d-]+\/promotion-exclusion$/);
    await dialog.getByRole("button", { name: "Xác nhận" }).click();
    const response = await saved;
    expect(response.status()).toBe(200);
    expect(response.request().postDataJSON()).toEqual({ excluded: true });
    await expect(tab(page, "Ngày thường")).toHaveAttribute("aria-selected", "true");
    await expect(dayRow(page, date)).toContainText("Giá ngày thường");
    await expect(dayRow(page, date)).toContainText("Không áp dụng");
    await chooseDayAction(page, date, "Cho phép xét U22");
    const include = page.getByRole("dialog").filter({ hasText: "Cho phép xét U22" });
    const back = waitApi(page, "PUT", /\/api\/pos\/date-in-year\/[\d-]+\/promotion-exclusion$/);
    await include.getByRole("button", { name: "Xác nhận" }).click();
    expect((await back).status()).toBe(200);
    await expect(dayRow(page, date)).toContainText("Có thể áp dụng");
    expect((await getDay(date))?.isPromotionExcluded).toBe(false);
  });

  test("V32-E06 Khởi tạo năm (năm QA chưa có dữ liệu): 20/10, 31/10, 20/11 theo giá tuần, còn lại giá lễ", async () => {
    const page = session!.page;
    if (await getDay(`${config.initYear}-01-01`)) {
      // Năm đã được khởi tạo ở lần chạy trước (qua UI): chỉ đối chiếu dữ liệu đã lưu, không khởi tạo năm khác.
      test
        .info()
        .annotations.push({ type: "note", description: `${config.initYear} đã khởi tạo trước đó` });
      expect((await getDay(`${config.initYear}-10-20`))?.applyHolidayPrice).toBe(false);
      expect((await getDay(`${config.initYear}-04-30`))?.applyHolidayPrice).toBe(true);
      return;
    }
    await goto(page, "#/holidays");
    await expect(page.getByRole("combobox", { name: "Tháng" })).toBeVisible({ timeout: 20000 });
    await pickYear(page, config.initYear);
    await expect(page.getByText(`Năm ${config.initYear} chưa có dữ liệu ngày`)).toBeVisible({
      timeout: 20000
    });
    await page.getByRole("button", { name: `Khởi tạo năm ${config.initYear}` }).click();
    const dialog = page.getByRole("dialog").filter({ hasText: "Khởi tạo" });
    await expect(dialog).toBeVisible();
    const initialized = waitApi(
      page,
      "POST",
      new RegExp(`/api/pos/date-in-year/initialize/${config.initYear}$`)
    );
    await dialog.getByRole("button", { name: "Khởi tạo" }).last().click();
    const response = await initialized;
    expect(response.status()).toBeLessThan(300);
    created.initYear = config.initYear;
    await saveCreated();
    const sent = response.request().postDataJSON() as {
      holidays: { dateValue: string; applyHolidayPrice?: boolean }[];
    };
    const mode = (mmdd: string) =>
      sent.holidays.find((holiday) => holiday.dateValue.slice(5) === mmdd)?.applyHolidayPrice;
    expect(mode("10-20")).toBe(false);
    expect(mode("10-31")).toBe(false);
    expect(mode("11-20")).toBe(false);
    expect(mode("04-30")).toBe(true);
    expect(mode("09-02")).toBe(true);
    expect((await getDay(`${config.initYear}-10-20`))?.applyHolidayPrice).toBe(false);
    expect((await getDay(`${config.initYear}-04-30`))?.applyHolidayPrice).toBe(true);
    await pickYear(page, Number(config.dates.N1.slice(0, 4)));
  });

  test("V32-E07 Giờ chiếu: cột Ưu đãi U22 theo suất; Tắt / Bật lại thật", async () => {
    const page = session!.page;
    await openScheduling(page, config.planName, config.dates.N1);
    const s1 = screeningRow(page, config.screenings.S1);
    await expect(s1).toContainText("Có thể áp dụng", { timeout: 20000 });
    await expect(screeningRow(page, config.screenings.S4)).toContainText("Không áp dụng");
    await expect(
      screeningRow(page, config.screenings.S4).getByRole("button", { name: /Bật lại|Tắt/ })
    ).toHaveCount(0);
    await expect(screeningRow(page, config.screenings.S6)).toContainText("Không áp dụng");
    await expect(
      screeningRow(page, config.screenings.S6).getByRole("button", { name: /Bật lại|Tắt/ })
    ).toHaveCount(0);
    const off = waitApi(
      page,
      "PATCH",
      new RegExp(`/api/pos/plan-screenings/${config.screenings.S1}$`)
    );
    await s1.getByRole("button", { name: "Tắt" }).click();
    await page.locator(".ant-modal-confirm").getByRole("button", { name: "Tắt U22" }).click();
    expect((await off).status()).toBe(200);
    await expect(toast(page, "Đã tắt ưu đãi U22 cho suất")).toBeVisible();
    await expect(s1.getByRole("button", { name: "Bật lại" })).toBeVisible({ timeout: 20000 });
    const on = waitApi(
      page,
      "PATCH",
      new RegExp(`/api/pos/plan-screenings/${config.screenings.S1}$`)
    );
    await s1.getByRole("button", { name: "Bật lại" }).click();
    await page.locator(".ant-modal-confirm").getByRole("button", { name: "Cho phép U22" }).click();
    expect((await on).status()).toBe(200);
    await expect(s1).toContainText("Có thể áp dụng", { timeout: 20000 });
  });

  test("V32-E08 Thêm ca chiếu mới: U22 mặc định bật, Đồng giá / 3D khóa U22, lưu thật LIST + U22", async () => {
    const page = session!.page;
    await openScheduling(page, config.planName, config.dates.UI);
    await page.getByRole("button", { name: "Thêm ca chiếu mới" }).click();
    const dialog = page.getByRole("dialog").filter({ hasText: "Thêm ca chiếu mới" });
    const chooseFilm = async (name: string) => {
      const film = dialog.getByRole("combobox").first();
      await film.click();
      await film.fill(name.slice(0, 10));
      await page.locator(".ant-select-item-option").filter({ hasText: name }).first().click();
    };
    await chooseFilm(config.film3DName);
    const time = dialog.getByLabel("Giờ chiếu");
    await time.click();
    await time.fill("19:00");
    await time.press("Enter");
    const date = dialog.getByLabel("Ngày chiếu");
    await date.click();
    await date.fill(ddmmyyyy(config.dates.UI));
    await date.press("Enter");
    await dialog.getByLabel("Phòng chiếu").click();
    await page
      .locator(".ant-select-item-option")
      .filter({ hasText: new RegExp(`^${config.roomName}$`) })
      .first()
      .click();
    const u22 = dialog.getByRole("checkbox", { name: "Áp dụng ưu đãi U22" });
    await expect(u22).toBeDisabled({ timeout: 20000 });
    await expect(dialog.getByTestId("u22-screening-reason")).toContainText("2D");
    const priced = waitApi(page, "POST", /\/api\/pos\/pricing\/plan-pricing$/);
    await chooseFilm(config.film2DName);
    expect((await priced).status()).toBeLessThan(300);
    await expect(u22).toBeEnabled({ timeout: 20000 });
    await expect(u22).toBeChecked();
    await dialog.getByRole("checkbox", { name: "Đồng giá" }).check();
    await expect(u22).toBeDisabled();
    await expect(u22).not.toBeChecked();
    await expect(dialog.getByTestId("u22-screening-reason")).toContainText("Đồng giá");
    await dialog.getByRole("checkbox", { name: "Đồng giá" }).uncheck();
    if (!(await u22.isChecked())) await u22.check();
    const saved = waitApi(page, "POST", /^\/api\/pos\/plan-screenings$/);
    await dialog.locator(".ant-modal-footer .ant-btn-primary").click();
    const confirm = page.locator(".ant-modal").filter({ hasText: "Xác nhận lưu" });
    if (await confirm.isVisible().catch(() => false))
      await confirm.getByRole("button", { name: "Xác nhận lưu" }).click();
    const response = await saved;
    expect(response.status()).toBe(201);
    const body = (await response.json()) as {
      id: number;
      u22Policy: { source: string; u22Enabled: boolean; priceMode: string };
    };
    created.screenings.push(body.id);
    await saveCreated();
    expect(response.request().postDataJSON()).toMatchObject({
      priceMode: "LIST",
      u22Enabled: true
    });
    expect(body.u22Policy).toMatchObject({
      source: "SCREENING_POLICY",
      u22Enabled: true,
      priceMode: "LIST"
    });
    await expect(toast(page, "Đã lưu thiết lập U22 của suất: Áp dụng ưu đãi U22.")).toBeVisible();
    await expect(screeningRow(page, body.id)).toContainText("Có thể áp dụng", { timeout: 20000 });
  });

  test("V32-E09 Đối chiếu giá từ Giờ chiếu: API lỗi → thông báo + Thử lại → tải được, không có nút áp dụng", async () => {
    const page = session!.page;
    await openScheduling(page, config.planName, config.dates.NH);
    let failures = 0;
    await page.route("**/api/pos/plan-screenings/repricing/preview", async (route) => {
      failures += 1;
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ statusCode: 500, message: "QA lỗi giả lập" })
      });
    });
    await page.getByRole("button", { name: "Đối chiếu giá suất chiếu" }).click();
    const repricing = page.getByRole("dialog").filter({ hasText: "Đối chiếu giá suất chiếu" });
    await expect(repricing.getByText("Không tải được kết quả đối chiếu giá")).toBeVisible({
      timeout: 20000
    });
    expect(failures).toBeGreaterThan(0);
    await page.unroute("**/api/pos/plan-screenings/repricing/preview");
    const loaded = waitApi(page, "POST", /\/api\/pos\/plan-screenings\/repricing\/preview$/);
    await repricing.getByRole("button", { name: "Thử lại" }).click();
    expect((await loaded).status()).toBe(200);
    await expect(repricing.getByText("Tổng suất chiếu")).toBeVisible();
    await expect(repricing.getByRole("button", { name: /Áp dụng/ })).toHaveCount(0);
    await repricing.getByRole("button", { name: "Đóng" }).click();
  });

  test("V32-E10 POS: thông báo U22 mới (ngày không áp ưu đãi, Đồng giá) và bán U22 tiền mặt → hủy vé", async () => {
    const page = session!.page;
    const card = config.cards.A;
    const excludedSeat = await findFreeSeat(config.screenings.S9);
    await openScreening(page, config.screenings.S9, excludedSeat.code);
    await selectSeat(page, excludedSeat.code);
    let vip = await openVipDialog(page, card);
    await expect(vip.getByRole("radio", { name: U22_RADIO })).toBeDisabled();
    await expect(vip.getByText(POLICY_BLOCKED)).toBeVisible();
    await closeModal(page, vip);

    const uniformSeat = await findFreeSeat(config.screenings.S4);
    await openScreening(page, config.screenings.S4, uniformSeat.code);
    await selectSeat(page, uniformSeat.code);
    vip = await openVipDialog(page, card);
    await expect(vip.getByRole("radio", { name: U22_RADIO })).toBeDisabled();
    await expect(vip.getByText("Suất chiếu Đồng giá không áp dụng ưu đãi U22.")).toBeVisible();
    await closeModal(page, vip);

    const seat = await findFreeSeat(config.screenings.S2);
    await openScreening(page, config.screenings.S2, seat.code);
    await selectSeat(page, seat.code);
    const invoice = page.getByRole("checkbox", { name: "Xuất hóa đơn" });
    if (!(await invoice.isChecked())) await invoice.check();
    vip = await openVipDialog(page, card);
    await expect(vip.getByText(/Giá vé U22 của suất chiếu này/)).toContainText("55.000");
    await vip.getByRole("radio", { name: U22_RADIO }).check();
    const sold = waitApi(page, "POST", /^\/api\/pos\/order$/);
    await vip.locator(".ant-modal-footer .ant-btn-primary").click();
    const response = await sold;
    expect(response.status()).toBe(201);
    expect(response.request().postDataJSON()).toMatchObject({
      voucherCode: "U22Ticket",
      memberCardCode: card,
      expectedU22Price: 55000,
      hasManualInvoice: true
    });
    const order = (await response.json()) as { id: number; orderTotal: number };
    created.orders.push(order.id);
    await saveCreated();
    expect(Number(order.orderTotal)).toBe(55000);
    const invoiceDialog = page.getByRole("dialog").filter({ hasText: "hóa đơn điện tử" });
    await expect(invoiceDialog).toBeVisible({ timeout: 15000 });
    await closeModal(page, invoiceDialog);

    // Hủy vé bằng luồng POS chuẩn.
    await openScreening(page, config.screenings.S2, seat.code);
    await page.getByRole("checkbox", { name: "Hủy vé", exact: true }).check();
    await page.locator(`[data-seat-code="${seat.code}"]`).first().click();
    await page.getByRole("button", { name: "Hủy vé", exact: true }).click();
    const cancel = page.locator(".ant-modal").filter({ hasText: "Hủy toàn bộ đơn vé?" });
    await expect(cancel).toContainText(`Đơn #${order.id}`);
    await cancel.getByRole("combobox").click();
    await page.locator(".ant-select-item-option").first().click();
    const cancelled = waitApi(page, "POST", /^\/api\/pos\/order\/cancel$/);
    await cancel.getByRole("button", { name: "Hủy toàn bộ đơn" }).click();
    expect((await cancelled).status()).toBe(201);
    await page
      .getByRole("checkbox", { name: "Hủy vé", exact: true })
      .uncheck()
      .catch(() => undefined);
  });
});
