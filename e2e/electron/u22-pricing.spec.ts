/**
 * E2E giá vé U22 (kế hoạch V6.2): Electron → NestJS local → `CinemaTicketDev` (DEV).
 *
 * Opt-in, chỉ chạy với backend loopback (scripts/dev/run-local.js của ncc-online-be-nestjs, mọi API ngoài bị
 * external-blocker chặn). Thao tác thật trên UI: tab "Giá vé U22", Danh sách ngày, POS "Quẹt thẻ VIP" → U22 →
 * In vé (tiền mặt, "Xuất hóa đơn" bật nên đơn không vào hàng đợi hóa đơn điện tử) → Hủy vé.
 * Máy in là IPC giả (không in ra giấy). Chỉ dùng API thật để đổi giá giữa chừng (ca 409) và đối chiếu.
 *
 * Env: E2E_U22_API_BASE (http://127.0.0.1:<port>), E2E_U22_USERNAME/PASSWORD (có ticket_prices.update,
 *      holidays.update), E2E_U22_CARD (thẻ U22 test, chưa dùng U22 hôm nay),
 *      E2E_U22_WEEKDAY_SCREEN / _SEAT / _INDEX (suất Thứ 4 tương lai, ghế VIP, vd. E10 / [4:4]),
 *      E2E_U22_WEEKEND_SCREEN / _SEAT / _INDEX (suất Thứ 7 tương lai, ghế VIP).
 * Sau khi chạy: giá trả về T2–T5 55.000 / T6–CN 70.000, ngày lễ test được bỏ đánh dấu, đơn test đã hủy.
 */
import {
  _electron as electron,
  expect,
  test,
  type ElectronApplication,
  type Page
} from "@playwright/test";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const API_BASE = process.env.E2E_U22_API_BASE || "";
const ACCOUNT = { username: process.env.E2E_U22_USERNAME, password: process.env.E2E_U22_PASSWORD };
const CARD = process.env.E2E_U22_CARD || "";
// Ghế: mã hiển thị (data-seat-code, vd. E10) và chỉ số ghế backend dùng tính giá (vd. [4:4]).
const WEEKDAY = {
  id: Number(process.env.E2E_U22_WEEKDAY_SCREEN),
  seat: process.env.E2E_U22_WEEKDAY_SEAT || "",
  index: process.env.E2E_U22_WEEKDAY_INDEX || ""
};
const WEEKEND = {
  id: Number(process.env.E2E_U22_WEEKEND_SCREEN),
  seat: process.env.E2E_U22_WEEKEND_SEAT || "",
  index: process.env.E2E_U22_WEEKEND_INDEX || ""
};
const FAKE_PRINTER = "QA-U22-FAKE-PRINTER";
const HOLIDAY_NAME = "Lễ E2E U22";
const U22_RADIO = "Áp dụng ưu đãi cho thành viên U22";
const SEED = { weekday: 55000, weekend: 70000 };

const isConfigured =
  /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(API_BASE) &&
  Boolean(ACCOUNT.username && ACCOUNT.password && CARD) &&
  [WEEKDAY, WEEKEND].every((screen) => screen.seat && screen.index) &&
  WEEKDAY.id > 0 &&
  WEEKEND.id > 0;

test.skip(!isConfigured, "Chỉ chạy khi cấu hình backend local (E2E_U22_*)");
test.describe.configure({ mode: "serial" });

type U22Config = Record<
  "priceMon" | "priceTue" | "priceWed" | "priceThu" | "priceFri" | "priceSat" | "priceSun",
  number
> & { version: number; updatedUser: string };

// ---------- API thật (dựng dữ liệu, đổi giá giữa chừng, đối chiếu) ----------
let token = "";
const apiCall = async <T>(method: string, url: string, body?: unknown) => {
  const response = await fetch(`${API_BASE}${url}`, {
    method,
    headers: {
      // Không gửi content-type khi không có body: Fastify từ chối JSON rỗng (backend trả 500).
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  return { status: response.status, body: (text ? JSON.parse(text) : null) as T };
};
const getConfig = async () => (await apiCall<U22Config>("GET", "/api/pos/u22-price-config")).body;
const week = (weekday: number, weekend: number) => ({
  priceMon: weekday,
  priceTue: weekday,
  priceWed: weekday,
  priceThu: weekday,
  priceFri: weekend,
  priceSat: weekend,
  priceSun: weekend
});
const putPrices = async (prices: Partial<U22Config>) => {
  const current = await getConfig();
  return apiCall<U22Config>("PUT", "/api/pos/u22-price-config", {
    ...current,
    ...prices,
    version: current.version
  });
};
const previewU22 = async (screen: typeof WEEKDAY) =>
  (
    await apiCall<{ reason: string; u22Price?: number }>(
      "POST",
      "/api/pos/order/validate-voucher",
      {
        planScreenId: screen.id,
        listChairIndexF1: screen.index,
        listChairValueF1: screen.seat,
        voucherCode: "U22Ticket",
        memberCardCode: CARD
      }
    )
  ).body;
const showDateOf = async (screen: typeof WEEKDAY) =>
  String(
    (await apiCall<{ projectDate: string }>("GET", `/api/pos/plan-screenings/${screen.id}`)).body
      .projectDate
  ).slice(0, 10);
type OrderDetail = {
  order: {
    id: number;
    orderStatusId: number;
    orderTotal: number;
    voucherCode: string;
    hasManualInvoice: boolean;
    items: { unitPriceInclTax: number; originUnitPriceInclTax: number }[];
  };
};
const orderDetail = async (id: number) =>
  (await apiCall<OrderDetail>("GET", `/api/pos/order/${id}`)).body.order;

// ---------- Electron ----------
type Session = { app: ElectronApplication; page: Page };
const launch = async (): Promise<Session> => {
  const profileDir = await mkdtemp(path.join(os.tmpdir(), "u22-e2e-"));
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
    window.setBounds({ x: 0, y: 0, width: 1600, height: 950 });
    // Máy in giả (biên phần cứng): ghi lại mỗi lệnh in, không in ra giấy.
    const state = globalThis as unknown as { qaPrints: unknown[] };
    state.qaPrints = [];
    ipcMain.removeHandler("print-tickets");
    ipcMain.handle(
      "print-tickets",
      (_event, tickets: { seat?: string; price?: string }[], printerName?: string) => {
        state.qaPrints.push({
          printerName,
          tickets: tickets.map((ticket) => ({ seat: ticket.seat, price: ticket.price }))
        });
        return true;
      }
    );
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
      JSON.stringify({ state: { posName: "QA U22 E2E", posShortName: "QAU22" }, version: 0 })
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
const prints = (session: Session) =>
  session.app.evaluate(
    () =>
      (globalThis as unknown as { qaPrints: { tickets: { seat?: string; price?: string }[] }[] })
        .qaPrints
  );

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
      response.request().method() === method && pattern.test(new URL(response.url()).pathname)
  );
const toast = (page: Page, text: string | RegExp) =>
  page.locator(".ant-message").getByText(text).last();
const formatVnd = (value: number) => `${value.toLocaleString("vi-VN")}đ`;

// ---------- Tab "Giá vé U22" ----------
const openU22Tab = async (page: Page) => {
  const loaded = waitApi(page, "GET", /^\/api\/pos\/u22-price-config$/);
  await goto(page, "#/ticket-prices");
  await page.getByRole("tab", { name: "Giá vé U22" }).click();
  expect((await loaded).status()).toBe(200);
};
const openEditDialog = async (page: Page) => {
  await page.getByRole("button", { name: /Chỉnh sửa giá/ }).click();
  const dialog = page.getByRole("dialog").filter({ hasText: "Chỉnh sửa giá vé U22" });
  await expect(dialog).toBeVisible();
  return dialog;
};
const fillPrice = async (dialog: ReturnType<Page["locator"]>, label: string, value: number) => {
  const input = dialog.getByLabel(label, { exact: true });
  await input.fill(String(value));
  await input.press("Tab");
};
const saveDialog = async (page: Page, dialog: ReturnType<Page["locator"]>) => {
  const saved = waitApi(page, "PUT", /^\/api\/pos\/u22-price-config$/);
  await dialog.getByRole("button", { name: /Lưu giá/ }).click();
  const response = await saved;
  expect(response.status()).toBe(200);
  await expect(toast(page, "Đã lưu giá vé U22")).toBeVisible();
  await expect(dialog).toBeHidden();
  return (await response.json()) as U22Config;
};

// ---------- Danh sách ngày ----------
const openHolidayMonth = async (page: Page, date: string) => {
  await goto(page, "#/holidays");
  const month = page.getByRole("combobox", { name: "Tháng" });
  await expect(month).toBeVisible({ timeout: 20000 });
  // Danh sách tháng của antd là danh sách ảo (chỉ render vài mục): chọn bằng bàn phím từ "Tất cả các tháng".
  await month.click();
  for (let index = 0; index < Number(date.slice(5, 7)); index += 1) await month.press("ArrowDown");
  await month.press("Enter");
  await expect(
    page
      .locator(".ant-select")
      .filter({ has: month })
      .getByText(`Tháng ${Number(date.slice(5, 7))}`)
  ).toBeVisible();
};
const dayRow = (page: Page, date: string) =>
  page.locator("tr.ant-table-row").filter({ hasText: date.split("-").reverse().join("/") });
/** Cột thao tác như các bảng khác: nút "⋯" của hàng mở menu, rồi bấm mục. */
const chooseDayAction = async (page: Page, date: string, action: string) => {
  await dayRow(page, date)
    .getByRole("button", { name: `Thao tác ngày ${date.split("-").reverse().join("/")}` })
    .click();
  await page
    .locator(".ant-dropdown:not(.ant-dropdown-hidden)")
    .getByRole("menuitem", { name: action })
    .click();
};

// ---------- POS ----------
const openScreening = async (page: Page, screen: typeof WEEKDAY) => {
  await goto(page, `#/plan-screening/${screen.id}`);
  await expect(page.locator(`[data-seat-code="${screen.seat}"]`)).toBeVisible({ timeout: 30000 });
};
const selectSeat = async (page: Page, code: string) => {
  const seat = page.locator(`[data-seat-code="${code}"]`);
  // Vẫn ở cùng suất sau bước trước: ghế còn được chọn, bấm lại sẽ bỏ chọn.
  if ((await seat.getAttribute("data-seat-selection-state")) !== "confirmed") await seat.click();
  await expect(seat).toHaveAttribute("data-seat-selection-state", "confirmed");
};
const printButton = (page: Page) => page.getByRole("button", { name: /In vé$/ });
/** "Quẹt thẻ VIP" → In vé → nhập thẻ → Tìm kiếm; trả về dialog thẻ VIP khi đã kiểm U22 xong. */
const openVipDialog = async (page: Page) => {
  const vip = page.getByRole("checkbox", { name: "Quẹt thẻ VIP" });
  if (!(await vip.isChecked())) await vip.check();
  await expect(printButton(page)).toBeEnabled({ timeout: 20000 });
  await printButton(page).click();
  const dialog = page.locator(".ant-modal").filter({ has: page.getByPlaceholder("Nhập số thẻ") });
  await expect(dialog).toBeVisible();
  const validated = waitApi(page, "POST", /^\/api\/pos\/order\/validate-voucher$/);
  await dialog.getByPlaceholder("Nhập số thẻ").fill(CARD);
  await dialog.getByRole("button", { name: "Tìm kiếm" }).click();
  expect((await validated).status()).toBeLessThan(300);
  return dialog;
};
const closeModal = async (page: Page, dialog: ReturnType<Page["locator"]>) => {
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
};
const checkExportInvoice = async (page: Page) => {
  const invoice = page.getByRole("checkbox", { name: "Xuất hóa đơn" });
  if (!(await invoice.isChecked())) await invoice.check();
};

test.describe("Giá vé U22 với API thật (BE local + CinemaTicketDev)", () => {
  let session: Session | undefined;
  let weekdayDate = "";
  let soldOrderId = 0;

  test.beforeAll(async () => {
    const answer = await apiCall<{ access_token: string }>("POST", "/api/pos/staff/login", ACCOUNT);
    token = answer.body.access_token;
    expect((await putPrices(week(SEED.weekday, SEED.weekend))).status).toBe(200);
    weekdayDate = await showDateOf(WEEKDAY);
    session = await launch();
    await login(session.page);
  });

  test.afterAll(async () => {
    await putPrices(week(SEED.weekday, SEED.weekend)).catch(() => undefined);
    if (weekdayDate)
      await apiCall("DELETE", `/api/pos/date-in-year/${weekdayDate}/holiday`).catch(
        () => undefined
      );
    await quit(session);
  });

  test("U22-FE-01 tab Giá vé U22 hiển thị 55.000 / 70.000 từ DB", async () => {
    const page = session!.page;
    await openU22Tab(page);
    await expect(page.getByTestId("u22-group-weekday")).toHaveText(formatVnd(55000));
    await expect(page.getByTestId("u22-group-weekend")).toHaveText(formatVnd(70000));
    await expect(page.getByTestId("u22-day-priceSat")).toHaveText(formatVnd(70000));
  });

  test("U22-FE-02 sửa 60.000 / 90.000 trên tab: lưu thật, backend và POS đọc giá mới", async () => {
    const page = session!.page;
    const dialog = await openEditDialog(page);
    await fillPrice(dialog, "Giá Thứ 2 – Thứ 5", 60000);
    await fillPrice(dialog, "Giá Thứ 6 – Chủ nhật", 90000);
    const saved = await saveDialog(page, dialog);
    expect(saved).toMatchObject({ ...week(60000, 90000), updatedUser: ACCOUNT.username });
    await expect(page.getByTestId("u22-group-weekday")).toHaveText(formatVnd(60000));
    await expect(page.getByTestId("u22-group-weekend")).toHaveText(formatVnd(90000));
    expect(await getConfig()).toMatchObject(week(60000, 90000));
    expect((await previewU22(WEEKDAY)).u22Price).toBe(60000);
    expect((await previewU22(WEEKEND)).u22Price).toBe(90000);
  });

  test("U22-FE-03 chỉnh riêng từng thứ (T4 65.000, T7 85.000) và lưu", async () => {
    const page = session!.page;
    const dialog = await openEditDialog(page);
    await dialog.getByRole("switch", { name: "Chỉnh riêng từng thứ" }).click();
    await fillPrice(dialog, "Giá Thứ 4", 65000);
    await fillPrice(dialog, "Giá Thứ 7", 85000);
    await expect(dialog.getByText("2 ngày thay đổi")).toBeVisible();
    await saveDialog(page, dialog);
    await expect(page.getByTestId("u22-group-weekday")).toHaveText("Giá riêng từng thứ");
    await expect(page.getByTestId("u22-day-priceWed")).toHaveText(formatVnd(65000));
    await expect(page.getByTestId("u22-day-priceSat")).toHaveText(formatVnd(85000));
    expect(await getConfig()).toMatchObject({
      ...week(60000, 90000),
      priceWed: 65000,
      priceSat: 85000
    });
  });

  test("U22-FE-04 đánh dấu ngày lễ: POS khóa U22 kèm tên ngày lễ", async () => {
    const page = session!.page;
    await openHolidayMonth(page, weekdayDate);
    const marked = waitApi(page, "PUT", /\/api\/pos\/date-in-year\/[\d-]+\/holiday$/);
    await chooseDayAction(page, weekdayDate, "Đánh dấu ngày lễ");
    const dialog = page.getByRole("dialog").filter({ hasText: "Tên ngày lễ" });
    await dialog.getByLabel("Tên ngày lễ").fill(HOLIDAY_NAME);
    await dialog.getByRole("button", { name: "Lưu" }).click();
    expect((await marked).status()).toBe(200);
    await expect(page.getByRole("tab", { name: /^Ngày lễ \(\d+\)/ })).toBeVisible();

    await openScreening(page, WEEKDAY);
    await selectSeat(page, WEEKDAY.seat);
    const vip = await openVipDialog(page);
    await expect(vip.getByRole("radio", { name: U22_RADIO })).toBeDisabled();
    await expect(
      vip.getByText(`Ngày suất chiếu là ngày lễ (${HOLIDAY_NAME}), không áp dụng ưu đãi U22.`)
    ).toBeVisible();
    await closeModal(page, vip);
  });

  test("U22-FE-05 bỏ đánh dấu ngày lễ: U22 hoạt động lại, preview đúng giá T4 65.000", async () => {
    const page = session!.page;
    await openHolidayMonth(page, weekdayDate);
    await page.getByRole("tab", { name: /^Ngày lễ/ }).click();
    const unmarked = waitApi(page, "DELETE", /\/api\/pos\/date-in-year\/[\d-]+\/holiday$/);
    await chooseDayAction(page, weekdayDate, "Bỏ đánh dấu ngày lễ");
    await page.locator(".ant-modal-confirm").getByRole("button", { name: "Bỏ đánh dấu" }).click();
    expect((await unmarked).status()).toBe(200);

    await openScreening(page, WEEKDAY);
    await selectSeat(page, WEEKDAY.seat);
    const vip = await openVipDialog(page);
    await expect(vip.getByRole("radio", { name: U22_RADIO })).toBeEnabled();
    await expect(vip.getByText(/Giá vé U22 của suất chiếu này/)).toContainText("65.000");
    await closeModal(page, vip);
  });

  test("U22-FE-06 giá đổi giữa preview và tạo đơn → 409, không tạo đơn", async () => {
    const page = session!.page;
    await openScreening(page, WEEKDAY);
    await selectSeat(page, WEEKDAY.seat);
    await checkExportInvoice(page);
    const vip = await openVipDialog(page);
    await expect(vip.getByText(/Giá vé U22 của suất chiếu này/)).toContainText("65.000");
    await vip.getByRole("radio", { name: U22_RADIO }).check();
    // Máy Admin khác đổi giá T4 trong lúc dialog đang mở.
    expect((await putPrices({ priceWed: 66000 })).status).toBe(200);
    const created = waitApi(page, "POST", /^\/api\/pos\/order$/);
    await vip.locator(".ant-modal-footer .ant-btn-primary").click();
    const response = await created;
    expect(response.status()).toBe(409);
    expect(await response.json()).toMatchObject({
      code: "U22_PRICE_CHANGED",
      details: { u22Price: 66000 }
    });
    await expect(toast(page, /Giá U22 vừa đổi thành 66\.000.*Chưa tạo đơn/)).toBeVisible();
  });

  test("U22-FE-07 bán U22 tiền mặt đúng giá đã xác nhận, in vé, báo cáo theo giá bán", async () => {
    const page = session!.page;
    await openScreening(page, WEEKDAY);
    await selectSeat(page, WEEKDAY.seat);
    await checkExportInvoice(page);
    const vip = await openVipDialog(page);
    await expect(vip.getByText(/Giá vé U22 của suất chiếu này/)).toContainText("66.000");
    await vip.getByRole("radio", { name: U22_RADIO }).check();
    const created = waitApi(page, "POST", /^\/api\/pos\/order$/);
    await vip.locator(".ant-modal-footer .ant-btn-primary").click();
    const response = await created;
    const sent = response.request().postDataJSON() as Record<string, unknown>;
    expect(sent).toMatchObject({
      voucherCode: "U22Ticket",
      memberCardCode: CARD,
      expectedU22Price: 66000,
      hasManualInvoice: true
    });
    expect(response.status()).toBe(201);
    soldOrderId = ((await response.json()) as { id: number }).id;
    // "Xuất hóa đơn": app mở dialog hóa đơn sau khi bán; đóng, không tạo hóa đơn.
    const invoice = page.getByRole("dialog").filter({ hasText: "hóa đơn điện tử" });
    await expect(invoice).toBeVisible({ timeout: 15000 });
    await closeModal(page, invoice);

    const order = await orderDetail(soldOrderId);
    expect(order).toMatchObject({
      orderStatusId: 30,
      orderTotal: 66000,
      voucherCode: "U22Ticket",
      hasManualInvoice: true
    });
    expect(order.items[0]).toMatchObject({
      unitPriceInclTax: 66000,
      originUnitPriceInclTax: 75000
    });
    await expect
      .poll(async () => (await prints(session!)).flatMap((job) => job.tickets))
      .toEqual([expect.objectContaining({ seat: expect.stringContaining(WEEKDAY.seat) })]);
    const [ticket] = (await prints(session!)).flatMap((job) => job.tickets);
    expect(String(ticket.price ?? "").replace(/\D/g, "")).toBe("66000");

    const report = await apiCall<{ priceHeaders?: unknown }>(
      "POST",
      "/api/reports/revenue-by-film",
      {
        fromDate: weekdayDate,
        toDate: weekdayDate,
        dateType: 1
      }
    );
    expect(report.status).toBeLessThan(300);
    expect(JSON.stringify(report.body)).toContain("66000");
  });

  test("U22-FE-08 hủy vé U22 (luồng cũ): đơn hủy, thẻ dùng U22 lại được", async () => {
    const page = session!.page;
    await openScreening(page, WEEKDAY);
    await page.getByRole("checkbox", { name: "Hủy vé", exact: true }).check();
    await page.locator(`[data-seat-code="${WEEKDAY.seat}"]`).click();
    await page.getByRole("button", { name: "Hủy vé", exact: true }).click();
    const dialog = page.locator(".ant-modal").filter({ hasText: "Hủy toàn bộ đơn vé?" });
    await expect(dialog).toContainText(`Đơn #${soldOrderId}`);
    await dialog.getByRole("combobox").click();
    await page.locator(".ant-select-item-option").filter({ hasText: "Khách không đến" }).click();
    const cancelled = waitApi(page, "POST", /^\/api\/pos\/order\/cancel$/);
    await dialog.getByRole("button", { name: "Hủy toàn bộ đơn" }).click();
    expect((await cancelled).status()).toBe(201);
    await expect.poll(async () => (await orderDetail(soldOrderId)).orderStatusId).toBe(60);
    expect((await previewU22(WEEKDAY)).reason).toBe("applied");
  });

  test("U22-FE-09 suất Thứ 7: POS preview giá riêng T7 85.000", async () => {
    const page = session!.page;
    await page
      .getByRole("checkbox", { name: "Hủy vé", exact: true })
      .uncheck()
      .catch(() => undefined);
    await openScreening(page, WEEKEND);
    await selectSeat(page, WEEKEND.seat);
    const vip = await openVipDialog(page);
    await expect(vip.getByText(/Giá vé U22 của suất chiếu này/)).toContainText("85.000");
    await closeModal(page, vip);
  });
});
