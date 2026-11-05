/* eslint-disable no-empty-pattern */
/**
 * P6 automated QA — layer 1: Electron UI E2E (voucher giấy + VietQR / VNPayQR, KHÔNG tiền thật).
 *
 * App POS Electron đã build (out/) → QA server P6 của ncc-online-be-nestjs trên 127.0.0.1:4310 →
 * SQL Server NCC_PaperVoucher_Test. Mỗi test: dữ liệu QA sạch (reset), Electron mới với profile riêng,
 * thao tác thật trên UI (ghế, voucher, phương thức, In vé, Kết thúc, Kiểm tra lại), thanh toán giả lập
 * bằng notification có ký gửi tới route HTTP thật của provider, đối chiếu DB qua kết nối độc lập
 * (db-cli.js của backend, cùng guard + bất biến với suite HTTP).
 *
 * MOCK ở biên phần cứng: IPC `print-tickets` / `get-printers` của main process được thay bằng máy in
 * giả ghi lại lệnh in (không in ra giấy), để kiểm tra "chỉ in vé khi thanh toán hoàn tất".
 *
 * Opt-in: chạy qua `pnpm qa:p6:auto` ở backend (P6_QA_E2E=1, P6_QA_BE_DIR, QA server đang chạy).
 */
import {
  _electron as electron,
  expect,
  test,
  type ElectronApplication,
  type Page,
  type TestInfo
} from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const QA_BASE = "http://127.0.0.1:4310";
const BE_DIR = process.env.P6_QA_BE_DIR;
const DB_CLI = BE_DIR
  ? path.join(BE_DIR, "test", "paper-voucher", "p6-qa", "automation", "db-cli.js")
  : "";
const SCREENING_ID = 9301;
const FAKE_PRINTER = "QA-P6-FAKE-PRINTER";
const VIETQR = "Payments.VietQR";
const VNPAY = "Payments.VNPay";
const HEADER = { HELD: 5, APPLIED: 10, RELEASED: 20 } as const;
const ORDER = { PENDING: 10, COMPLETED: 30, FAIL: 60 } as const;
const DB_TIMEOUT = 20000;

test.skip(
  process.env.P6_QA_E2E !== "1" || !BE_DIR,
  "Chỉ chạy qua pnpm qa:p6:auto (QA server P6 local + DB NCC_PaperVoucher_Test)"
);

// ---------- QA server + DB ----------
type Snapshot = {
  orderId: number;
  order: {
    orderStatusId: number;
    paymentStatusId: number;
    orderTotal: number;
    paymentMethodSystemName: string;
  } | null;
  header: {
    status: number;
    paymentMethodSystemName: string;
    orderTotal: number;
    voucherApplied: number;
    remainingPayable: number;
    collectedAmount: number | null;
    paymentTransactionId: string | null;
  } | null;
  usages: { batchCode: string; quantity: number; appliedAmount: number; status: number }[];
  transactions: {
    id: string;
    paymentType: string;
    status: string;
    transactionAmount: number;
    qrCode: string;
  }[];
};

const qaApi = async <T = unknown>(method: string, url: string, body?: unknown) => {
  const response = await fetch(`${QA_BASE}${url}`, {
    method,
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  return { status: response.status, body: (text ? JSON.parse(text) : null) as T };
};

const dbCli = <T>(...args: string[]): T =>
  JSON.parse(execFileSync(process.execPath, [DB_CLI, ...args], { encoding: "utf8", cwd: BE_DIR }));

const snapshot = (orderId: number) => {
  const [row] = dbCli<{ snapshot: Snapshot; issues: string[] }[]>("snapshot", String(orderId));
  return row;
};
const qaOrderIds = () => dbCli<number[]>("orders");
const usedCount = (batchCode: string) =>
  dbCli<{ batches: { batchCode: string; usedCount: number }[] }>("batches").batches.find(
    (row) => row.batchCode === batchCode
  )!.usedCount;

/** Signed provider notification, POSTed to the REAL route (VNPay IPN / VietQR callback route A). */
const pay = async (orderId: number, kind = "success") => {
  const notification = await qaApi<{ ok: boolean; route: string; payload: unknown }>(
    "POST",
    "/__qa/api/notification",
    { orderId, kind }
  );
  expect(notification.body.ok, JSON.stringify(notification.body)).toBe(true);
  return qaApi<{ code?: string }>("POST", notification.body.route, notification.body.payload);
};

const expectDb = async (orderId: number, predicate: (snap: Snapshot) => boolean, label: string) => {
  await expect
    .poll(() => predicate(snapshot(orderId).snapshot), {
      message: label,
      timeout: DB_TIMEOUT,
      intervals: [300, 500, 1000]
    })
    .toBe(true);
  const row = snapshot(orderId);
  expect(row.issues, `invariants of order ${orderId}`).toEqual([]);
  return row.snapshot;
};

const digits = (text: string | null) => Number(String(text ?? "").replace(/[^\d]/g, ""));

// ---------- Electron ----------
type Pos = {
  app: ElectronApplication;
  page: Page;
  blocked: string[];
  orderResponses: { status: number; id?: number }[];
  apiCalls: string[];
};

const launch = async (testInfo: TestInfo): Promise<Pos> => {
  const profileDir = testInfo.outputPath("profile");
  await mkdir(profileDir, { recursive: true });
  await writeFile(
    path.join(profileDir, "config.json"),
    JSON.stringify({
      apiBaseUrl: QA_BASE,
      socketUrl: QA_BASE.replace(/^http/, "ws"),
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
  await page.context().tracing.start({ screenshots: true, snapshots: true });
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
      (_event, tickets: { ticketCode?: string; seat?: string }[], printerName?: string) => {
        state.qaPrints.push({
          at: Date.now(),
          printerName,
          tickets: tickets.map((ticket) => ({ ticketCode: ticket.ticketCode, seat: ticket.seat }))
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
  const blocked: string[] = [];
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (/^https?:$/.test(url.protocol) && url.origin !== QA_BASE) {
      blocked.push(`${route.request().method()} ${url.origin}${url.pathname}`);
      return route.abort();
    }
    return route.continue();
  });
  const orderResponses: Pos["orderResponses"] = [];
  const apiCalls: string[] = [];
  const started = Date.now();
  const callLabel = (request: { method: () => string; url: () => string }) =>
    `${request.method()} ${new URL(request.url()).pathname}`;
  page.on("requestfinished", async (request) => {
    if (!request.url().startsWith(`${QA_BASE}/api/`)) return;
    const response = await request.response().catch(() => null);
    apiCalls.push(
      `+${Date.now() - started}ms ${callLabel(request)} → ${response?.status() ?? "?"}`
    );
  });
  page.on("requestfailed", (request) => {
    if (request.url().startsWith(`${QA_BASE}/api/`))
      apiCalls.push(
        `+${Date.now() - started}ms ${callLabel(request)} → FAILED ${request.failure()?.errorText}`
      );
  });
  page.on("response", async (response) => {
    if (
      response.request().method() !== "POST" ||
      new URL(response.url()).pathname !== "/api/pos/order"
    )
      return;
    const body = await response.json().catch(() => null);
    orderResponses.push({ status: response.status(), id: body?.id });
  });
  // Mọi thông báo antd xuất hiện (kể cả đã tự ẩn) được ghi lại để đếm "báo thành công đúng một lần".
  await page.context().addInitScript(() => {
    const record = window as unknown as { qaToasts: { at: number; text: string }[] };
    record.qaToasts = [];
    const seen = new WeakSet<Element>();
    const collect = () =>
      document.querySelectorAll(".ant-message-notice").forEach((notice) => {
        if (seen.has(notice)) return;
        seen.add(notice);
        record.qaToasts.push({ at: Date.now(), text: notice.textContent ?? "" });
      });
    document.addEventListener("DOMContentLoaded", () =>
      new MutationObserver(collect).observe(document.body, { childList: true, subtree: true })
    );
  });
  await page.evaluate((printer) => {
    localStorage.setItem(
      "pos-settings",
      JSON.stringify({ state: { posName: "QA P6 E2E", posShortName: "QAE2E" }, version: 0 })
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
  return { app, page, blocked, orderResponses, apiCalls };
};

const toasts = (pos: Pos, pattern: RegExp) =>
  pos.page.evaluate(
    (source) =>
      (window as unknown as { qaToasts: { text: string }[] }).qaToasts.filter((toast) =>
        new RegExp(source).test(toast.text)
      ).length,
    pattern.source
  );

const prints = (pos: Pos) =>
  pos.app.evaluate(
    () =>
      (
        globalThis as unknown as {
          qaPrints: { tickets: { ticketCode?: string; seat?: string }[] }[];
        }
      ).qaPrints
  );

const close = async (pos: Pos | undefined, testInfo: TestInfo) => {
  if (!pos) return;
  const failed = testInfo.status !== testInfo.expectedStatus;
  if (failed) {
    await pos.page.screenshot({ path: testInfo.outputPath("failure.png") }).catch(() => undefined);
  }
  await pos.page
    .context()
    .tracing.stop(failed ? { path: testInfo.outputPath("trace.zip") } : undefined)
    .catch(() => undefined);
  await testInfo.attach("pos-evidence.json", {
    body: JSON.stringify(
      {
        blocked: pos.blocked,
        orderResponses: pos.orderResponses,
        prints: await prints(pos).catch(() => null),
        toasts: await pos.page
          .evaluate(() => (window as unknown as { qaToasts: unknown[] }).qaToasts)
          .catch(() => null),
        apiCalls: pos.apiCalls
      },
      null,
      2
    ),
    contentType: "application/json"
  });
  await pos.app.evaluate(({ app }) => app.exit(0)).catch(() => undefined);
  await pos.app.close().catch(() => undefined);
  // Profile Electron tạm (~4 MB/test) không phải evidence: xóa sau mỗi test.
  await rm(testInfo.outputPath("profile"), {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 500
  }).catch(() => undefined);
};

const login = async (page: Page) => {
  const credentials = JSON.parse(
    readFileSync(
      path.join(BE_DIR!, "test", "paper-voucher", "p6-qa", "credentials.local.json"),
      "utf8"
    )
  ) as { username: string; password: string };
  await expect(page.getByRole("heading", { name: "Chào mừng trở lại" })).toBeVisible({
    timeout: 60000
  });
  await page.getByLabel("Tên đăng nhập").fill(credentials.username);
  await page.getByLabel("Mật khẩu").fill(credentials.password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).not.toHaveURL(/#\/login/, { timeout: 30000 });
};

const openScreening = async (page: Page) => {
  await page.evaluate((id) => {
    window.location.hash = `#/plan-screening/${id}`;
  }, SCREENING_ID);
  await expect(page.locator('[data-seat-code="A1"]')).toBeVisible({ timeout: 30000 });
};

const startPos = async (testInfo: TestInfo) => {
  const reset = await qaApi("POST", "/__qa/api/reset", {});
  expect(reset.status).toBe(200);
  const pos = await launch(testInfo);
  await login(pos.page);
  await openScreening(pos.page);
  return pos;
};

const selectSeats = async (page: Page, codes: string[]) => {
  for (const code of codes) {
    const seat = page.locator(`[data-seat-code="${code}"]`);
    await seat.click();
    await expect(seat).toHaveAttribute("data-seat-selection-state", "confirmed");
  }
};

const voucherDialog = (page: Page) =>
  page.locator(".ant-modal").filter({ hasText: "Áp dụng voucher giấy" });

/** Chọn lô trong popup Voucher giấy, chờ báo giá, bấm Áp dụng; trả về "Cần thanh toán thêm" của popup. */
const applyVouchers = async (page: Page, vouchers: { code: string; quantity?: number }[]) => {
  await page.getByRole("button", { name: /Voucher giấy/ }).click();
  const dialog = voucherDialog(page);
  await expect(dialog).toBeVisible();
  for (const { code, quantity = 1 } of vouchers) {
    const option = dialog.getByTestId(`paper-voucher-option-${code}`);
    await option.getByRole("button", { name: "Chọn" }).click();
    for (let index = 1; index < quantity; index += 1)
      await dialog.getByRole("button", { name: `Tăng số lượng ${code}`, exact: true }).click();
    await expect(
      dialog.getByRole("spinbutton", { name: `Số lượng ${code}`, exact: true })
    ).toHaveValue(String(quantity));
  }
  const remaining = dialog.getByTestId("paper-voucher-remaining");
  await expect(remaining).toBeVisible();
  await expect(dialog.getByTestId("paper-voucher-quote-loading")).toHaveCount(0);
  const remainingText = await remaining.innerText();
  await dialog.getByRole("button", { name: "Áp dụng", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  // In vé chỉ bật khi báo giá ở màn bán vé đã xong (trước đó app tự bỏ chọn QR chưa được phép).
  await expect(printButton(page)).toBeEnabled({ timeout: 20000 });
  return remainingText;
};

const qrOption = (page: Page, method: string) =>
  page.getByRole("checkbox", { name: method === VIETQR ? "Quét VietQR" : "Quét VNPayQR" });
/** Tick ô QR; nhóm ô bị khóa trong lúc màn bán vé đồng bộ ghế/báo giá: thử lại tới khi ô được chọn. */
const checkQr = (page: Page, method: string) =>
  expect(async () => {
    const option = qrOption(page, method);
    await option.check({ timeout: 2000 });
    await expect(option).toBeChecked({ timeout: 1000 });
  }).toPass({ timeout: 20000 });
const printButton = (page: Page) => page.getByRole("button", { name: /In vé$/ });
const qrDialog = (page: Page) =>
  page.locator(".ant-modal").filter({ hasText: "Thanh toán QR Code" });
const toast = (page: Page, text: string | RegExp) =>
  page.locator(".ant-message").getByText(text).last();

/** In vé (QR): tạo đơn + QR; trả về id đơn và màn QR. */
const printForQr = async (pos: Pos, method: string) => {
  await checkQr(pos.page, method);
  const created = pos.page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/pos/order" &&
      response.request().method() === "POST"
  );
  await printButton(pos.page).click();
  const order = await (await created).json();
  const dialog = qrDialog(pos.page);
  await expect(dialog).toBeVisible({ timeout: 20000 });
  return { orderId: Number(order.id), dialog };
};

const qrAmounts = async (page: Page) => ({
  ticketTotal: digits(await page.getByTestId("qr-ticket-total").innerText()),
  voucherApplied: digits(await page.getByTestId("qr-paper-voucher-applied").innerText()),
  payable: digits(await page.getByTestId("qr-payable-amount").innerText())
});

const evidence = (testInfo: TestInfo, name: string, data: unknown) =>
  testInfo.attach(name, { body: JSON.stringify(data, null, 2), contentType: "application/json" });

// ======================= tests =======================
let pos: Pos | undefined;
test.afterEach(async ({}, testInfo) => {
  await close(pos, testInfo);
  pos = undefined;
  await qaApi("POST", "/__qa/api/offline", { offline: false });
  await qaApi("POST", "/__qa/api/faults", { clear: true });
});

test("P6-E2E-01 [A01 B01 B02 F06] VietQR: 1 vé + LÔ-901 → QR 20.000 → thanh toán → APPLIED, in vé một lần", async ({}, testInfo) => {
  pos = await startPos(testInfo);
  const before = usedCount("LÔ-901");
  await selectSeats(pos.page, ["A1"]);
  expect(digits(await applyVouchers(pos.page, [{ code: "LÔ-901" }]))).toBe(20000);
  const { orderId, dialog } = await printForQr(pos, VIETQR);
  expect(await qrAmounts(pos.page)).toEqual({
    ticketTotal: 100000,
    voucherApplied: 80000,
    payable: 20000
  });
  await pos.page.screenshot({ path: testInfo.outputPath("qr-vietqr-20000.png") });
  const held = await expectDb(
    orderId,
    (snap) => snap.header?.status === HEADER.HELD && snap.transactions.length === 1,
    "HELD + QR transaction"
  );
  expect(held.order!.orderTotal).toBe(100000);
  expect([
    held.header!.voucherApplied,
    held.header!.remainingPayable,
    held.header!.collectedAmount
  ]).toEqual([80000, 20000, null]);
  expect([
    held.transactions[0].paymentType,
    held.transactions[0].status,
    held.transactions[0].transactionAmount
  ]).toEqual([VIETQR, "new", 20000]);
  expect(held.transactions[0].qrCode).toMatch(/^QA-P6-DEMO\|KHONG-THANH-TOAN\|/);
  expect(usedCount("LÔ-901")).toBe(before + 1);
  expect(await prints(pos)).toHaveLength(0);
  expect((await pay(orderId)).status).toBe(201);
  await expect(
    toast(pos.page, /Thanh toán VietQR thành công 20\.000.*Voucher giấy 80\.000.*LÔ-901 ×1/)
  ).toBeVisible({ timeout: 20000 });
  await expect(dialog).toHaveCount(0);
  const applied = await expectDb(
    orderId,
    (snap) => snap.header?.status === HEADER.APPLIED,
    "APPLIED"
  );
  expect([applied.order!.orderStatusId, applied.header!.collectedAmount]).toEqual([
    ORDER.COMPLETED,
    20000
  ]);
  expect(applied.header!.paymentTransactionId).toBe(applied.transactions[0].id);
  await expect.poll(async () => (await prints(pos!)).length).toBe(1);
  await expect(pos.page.locator('[data-seat-code="A1"]')).toHaveAttribute(
    "data-seat-selection-state",
    "idle"
  );
  await expect(pos.page.getByTestId("last-sale-total")).toContainText("100.000");
  await evidence(testInfo, "db.json", { held, applied });
});

test("P6-E2E-02 [C01 C02] VNPayQR: 1 vé + LÔ-901 → QR 20.000 → IPN 00 → APPLIED", async ({}, testInfo) => {
  pos = await startPos(testInfo);
  await selectSeats(pos.page, ["A2"]);
  await applyVouchers(pos.page, [{ code: "LÔ-901" }]);
  const { orderId, dialog } = await printForQr(pos, VNPAY);
  expect(await qrAmounts(pos.page)).toEqual({
    ticketTotal: 100000,
    voucherApplied: 80000,
    payable: 20000
  });
  await expectDb(
    orderId,
    (snap) =>
      snap.transactions[0]?.paymentType === VNPAY &&
      snap.transactions[0]?.transactionAmount === 20000,
    "VNPay QR 20.000"
  );
  const ipn = await pay(orderId);
  expect(ipn.body.code).toBe("00");
  await expect(
    toast(pos.page, /Thanh toán VNPayQR thành công 20\.000.*Voucher giấy 80\.000.*LÔ-901 ×1/)
  ).toBeVisible({ timeout: 20000 });
  await expect(dialog).toHaveCount(0);
  const applied = await expectDb(
    orderId,
    (snap) => snap.header?.status === HEADER.APPLIED,
    "APPLIED"
  );
  expect(applied.header!.collectedAmount).toBe(20000);
  await expect.poll(async () => (await prints(pos!)).length).toBe(1);
  await evidence(testInfo, "db.json", applied);
});

test("P6-E2E-03 [A03] nhiều vé VIP + nhiều lô (2×LÔ-901 + LÔ-904) → VNPayQR 50.000", async ({}, testInfo) => {
  pos = await startPos(testInfo);
  await selectSeats(pos.page, ["D1", "D2"]);
  expect(
    digits(await applyVouchers(pos.page, [{ code: "LÔ-901", quantity: 2 }, { code: "LÔ-904" }]))
  ).toBe(50000);
  const { orderId } = await printForQr(pos, VNPAY);
  expect(await qrAmounts(pos.page)).toEqual({
    ticketTotal: 240000,
    voucherApplied: 190000,
    payable: 50000
  });
  const held = await expectDb(orderId, (snap) => snap.header?.status === HEADER.HELD, "HELD");
  expect(
    held.usages.map((usage) => [usage.batchCode, usage.quantity, usage.appliedAmount])
  ).toEqual([
    ["LÔ-901", 2, 160000],
    ["LÔ-904", 1, 30000]
  ]);
  expect((await pay(orderId)).body.code).toBe("00");
  await expect(
    toast(pos.page, /Thanh toán VNPayQR thành công 50\.000.*Voucher giấy 190\.000/)
  ).toBeVisible({ timeout: 20000 });
  const applied = await expectDb(
    orderId,
    (snap) => snap.header?.status === HEADER.APPLIED,
    "APPLIED"
  );
  expect([applied.order!.orderTotal, applied.header!.collectedAmount]).toEqual([240000, 50000]);
  await expect
    .poll(async () => (await prints(pos!)).flatMap((print) => print.tickets).length)
    .toBe(2);
});

test("P6-E2E-04 [A04] voucher trả đủ (LÔ-903): QR bị khóa, In vé = tiền mặt 0 đ, không có giao dịch QR", async ({}, testInfo) => {
  pos = await startPos(testInfo);
  await selectSeats(pos.page, ["A3"]);
  expect(digits(await applyVouchers(pos.page, [{ code: "LÔ-903" }]))).toBe(0);
  await expect(qrOption(pos.page, VIETQR)).toBeDisabled();
  await expect(qrOption(pos.page, VNPAY)).toBeDisabled();
  await printButton(pos.page).click();
  await expect.poll(() => pos!.orderResponses.length).toBe(1);
  const orderId = pos.orderResponses[0].id!;
  const applied = await expectDb(
    orderId,
    (snap) => snap.header?.status === HEADER.APPLIED,
    "APPLIED (cash)"
  );
  expect([
    applied.order!.paymentMethodSystemName,
    applied.order!.orderStatusId,
    applied.header!.collectedAmount
  ]).toEqual(["POS", ORDER.COMPLETED, 0]);
  expect(applied.transactions).toHaveLength(0);
  await expect(qrDialog(pos.page)).toHaveCount(0);
  await expect.poll(async () => (await prints(pos!)).length).toBe(1);
});

test("P6-E2E-05 [A12] đổi voucher trước khi In vé (LÔ-901 → LÔ-902): QR 50.000, chỉ LÔ-902 bị dùng", async ({}, testInfo) => {
  pos = await startPos(testInfo);
  const before = { "LÔ-901": usedCount("LÔ-901"), "LÔ-902": usedCount("LÔ-902") };
  await selectSeats(pos.page, ["A4"]);
  expect(digits(await applyVouchers(pos.page, [{ code: "LÔ-901" }]))).toBe(20000);
  await pos.page.getByRole("button", { name: /Voucher giấy/ }).click();
  const dialog = voucherDialog(pos.page);
  await dialog.getByRole("button", { name: "Giảm số lượng LÔ-901", exact: true }).click();
  await dialog
    .getByTestId("paper-voucher-option-LÔ-902")
    .getByRole("button", { name: "Chọn" })
    .click();
  await expect(dialog.getByTestId("paper-voucher-quote-loading")).toHaveCount(0);
  expect(digits(await dialog.getByTestId("paper-voucher-remaining").innerText())).toBe(50000);
  await dialog.getByRole("button", { name: "Áp dụng", exact: true }).click();
  const { orderId } = await printForQr(pos, VIETQR);
  expect((await qrAmounts(pos.page)).payable).toBe(50000);
  const held = await expectDb(orderId, (snap) => snap.header?.status === HEADER.HELD, "HELD");
  expect(held.usages.map((usage) => usage.batchCode)).toEqual(["LÔ-902"]);
  expect(usedCount("LÔ-901")).toBe(before["LÔ-901"]);
  expect(usedCount("LÔ-902")).toBe(before["LÔ-902"] + 1);
});

test("P6-E2E-06 [B08 F06] VietQR: Kết thúc khi chưa thanh toán → FAIL + RELEASED, không in vé", async ({}, testInfo) => {
  pos = await startPos(testInfo);
  const before = usedCount("LÔ-901");
  await selectSeats(pos.page, ["A6"]);
  await applyVouchers(pos.page, [{ code: "LÔ-901" }]);
  const { orderId, dialog } = await printForQr(pos, VIETQR);
  await expectDb(orderId, (snap) => snap.header?.status === HEADER.HELD, "HELD");
  await dialog.getByRole("button", { name: "Kết thúc" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    toast(pos.page, new RegExp(`Đơn #${orderId} đã kết thúc, voucher giấy đã được trả lại`))
  ).toBeVisible();
  const released = await expectDb(
    orderId,
    (snap) => snap.header?.status === HEADER.RELEASED,
    "RELEASED"
  );
  expect(released.order!.orderStatusId).toBe(ORDER.FAIL);
  expect(usedCount("LÔ-901")).toBe(before);
  expect(await prints(pos)).toHaveLength(0);
});

test("P6-E2E-07 [C03 F06] VNPayQR: IPN thất bại → Kiểm tra lại đóng QR, FAIL + RELEASED, không in vé", async ({}, testInfo) => {
  pos = await startPos(testInfo);
  await selectSeats(pos.page, ["A7"]);
  await applyVouchers(pos.page, [{ code: "LÔ-901" }]);
  const { orderId, dialog } = await printForQr(pos, VNPAY);
  expect((await pay(orderId, "failure")).body.code).toBe("00");
  await expectDb(
    orderId,
    (snap) => snap.header?.status === HEADER.RELEASED,
    "RELEASED by the failed IPN"
  );
  await dialog.getByRole("button", { name: /Kiểm tra lại giao dịch/ }).click();
  await expect(dialog).toHaveCount(0);
  await expect(toast(pos.page, /Không in vé/)).toBeVisible();
  expect(await prints(pos)).toHaveLength(0);
});

test("P6-E2E-08 [E04 E06 F06] VNPayQR: lỗi DB khi xác nhận (IPN 99) → QR giữ, Kết thúc bị chặn, app tự hoàn tất → in một lần", async ({}, testInfo) => {
  pos = await startPos(testInfo);
  await selectSeats(pos.page, ["A8"]);
  await applyVouchers(pos.page, [{ code: "LÔ-901" }]);
  const { orderId, dialog } = await printForQr(pos, VNPAY);
  await qaApi("POST", "/__qa/api/faults", { dbFailure: true });
  expect((await pay(orderId)).body.code).toBe("99");
  const failed = await expectDb(
    orderId,
    (snap) => snap.transactions[0]?.status === "success",
    "money recorded"
  );
  expect([failed.order!.orderStatusId, failed.header!.status]).toEqual([
    ORDER.PENDING,
    HEADER.HELD
  ]);
  await expect(dialog).toBeVisible();
  expect(await prints(pos)).toHaveLength(0);
  await dialog.getByRole("button", { name: "Kết thúc" }).click();
  await expect(toast(pos.page, /Thanh toán VNPayQR thành công 20\.000/)).toBeVisible({
    timeout: 20000
  });
  await expect(dialog).toHaveCount(0);
  const applied = await expectDb(
    orderId,
    (snap) => snap.header?.status === HEADER.APPLIED,
    "APPLIED after the POS completed it"
  );
  expect(applied.header!.collectedAmount).toBe(20000);
  await expect.poll(async () => (await prints(pos!)).length).toBe(1);
});

test("P6-E2E-09 [D01] double-click In vé: một đơn, một voucher giữ, một giao dịch QR", async ({}, testInfo) => {
  pos = await startPos(testInfo);
  const before = usedCount("LÔ-901");
  await selectSeats(pos.page, ["B1"]);
  await applyVouchers(pos.page, [{ code: "LÔ-901" }]);
  await checkQr(pos.page, VIETQR);
  await printButton(pos.page).dblclick();
  await expect(qrDialog(pos.page)).toBeVisible({ timeout: 20000 });
  await expect.poll(() => qaOrderIds().length, { timeout: DB_TIMEOUT }).toBe(1);
  const [orderId] = qaOrderIds();
  const held = await expectDb(
    orderId,
    (snap) => snap.transactions.length === 1,
    "one QR transaction"
  );
  expect(held.header!.status).toBe(HEADER.HELD);
  expect(usedCount("LÔ-901")).toBe(before + 1);
  await evidence(testInfo, "order-responses.json", pos.orderResponses);
  expect(
    new Set(pos.orderResponses.filter((answer) => answer.id).map((answer) => answer.id)).size
  ).toBe(1);
});

test("P6-E2E-10 [D08] socket và Kiểm tra lại cùng lúc: báo thành công một lần, in một lần", async ({}, testInfo) => {
  pos = await startPos(testInfo);
  await selectSeats(pos.page, ["B2"]);
  await applyVouchers(pos.page, [{ code: "LÔ-901" }]);
  const { orderId, dialog } = await printForQr(pos, VNPAY);
  const recheck = dialog.getByRole("button", { name: /Kiểm tra lại giao dịch/ });
  // Cuộc đua thật: bấm "Kiểm tra lại" và IPN gần như cùng lúc. Socket có thể thắng và đóng QR trước khi
  // kịp bấm: cả hai kết cục đều hợp lệ, bất biến là báo thành công một lần và in một lần.
  const [click, ipn] = await Promise.all([
    recheck
      .click({ timeout: 5000 })
      .then(() => "recheck clicked")
      .catch(() => "QR closed by the socket before the click"),
    pay(orderId)
  ]);
  await evidence(testInfo, "race.json", { click, ipn: ipn.body });
  expect(ipn.body.code).toBe("00");
  await expect
    .poll(() => toasts(pos!, /Thanh toán VNPayQR thành công/), { timeout: 20000 })
    .toBeGreaterThan(0);
  await expect(dialog).toHaveCount(0);
  await expectDb(orderId, (snap) => snap.header?.status === HEADER.APPLIED, "APPLIED");
  await pos.page.waitForTimeout(3000); // để một sự kiện trùng (socket / kiểm tra lại) kịp tới nếu có
  expect(await prints(pos)).toHaveLength(1);
  expect(await toasts(pos, /Thanh toán VNPayQR thành công/)).toBe(1);
});

// Race tìm ra ở P6-D05 (lượt P6AUTO-20261105T041454), làm tất định bằng điểm dừng QA trong bước đóng QR:
// tiền về đúng lúc thu ngân bấm "Kết thúc". Không được báo "voucher đã được trả lại / Không in vé".
test("P6-E2E-16 [D05 F06] bấm Kết thúc đúng lúc tiền về: báo thành công một lần, in một lần, không báo trả voucher", async ({}, testInfo) => {
  pos = await startPos(testInfo);
  await selectSeats(pos.page, ["C6"]);
  await applyVouchers(pos.page, [{ code: "LÔ-901" }]);
  const { orderId, dialog } = await printForQr(pos, VNPAY);
  await qaApi("POST", "/__qa/api/faults", { closeDelayMs: 2000 });
  await dialog.getByRole("button", { name: "Kết thúc" }).click();
  await pos.page.waitForTimeout(300);
  expect((await pay(orderId)).body.code).toBe("00");
  await expect(dialog).toHaveCount(0, { timeout: 20000 });
  const applied = await expectDb(
    orderId,
    (snap) => snap.header?.status === HEADER.APPLIED,
    "APPLIED"
  );
  expect(applied.header!.collectedAmount).toBe(20000);
  await pos.page.waitForTimeout(4000); // câu trả lời của "Kết thúc" (bị dừng 2 s) về sau sự kiện thanh toán
  const released = await toasts(pos, /voucher giấy đã được trả lại/);
  const paid = await toasts(pos, /Thanh toán VNPayQR thành công 20\.000/);
  await evidence(testInfo, "close-vs-payment.json", {
    released,
    paid,
    prints: await prints(pos),
    apiCalls: pos.apiCalls.filter((call) => /status|order\/\d+/.test(call))
  });
  expect(released, "no 'voucher returned / no ticket' message for a paid order").toBe(0);
  expect(paid).toBe(1);
  expect(await prints(pos)).toHaveLength(1);
});

// ---------- O-8: hủy cả đơn đang chờ QR (sơ đồ ghế, chế độ "Hủy vé") đúng lúc tiền về ----------
/** Đơn VNPay đang chờ QR: tạo QR rồi rời màn bán vé (không Kết thúc / Esc, cả hai đều đóng QR), quay lại sơ đồ ghế. */
const leaveWaitingQrOrder = async (pos: Pos, seat: string) => {
  await selectSeats(pos.page, [seat]);
  await applyVouchers(pos.page, [{ code: "LÔ-901" }]);
  const { orderId } = await printForQr(pos, VNPAY);
  await pos.page.evaluate(() => {
    window.location.hash = "#/order-history";
  });
  await expect(pos.page.locator("tr.ant-table-row").first()).toBeVisible({ timeout: 20000 });
  await openScreening(pos.page);
  await expectDb(
    orderId,
    (snap) => snap.header?.status === HEADER.HELD,
    "order still waiting (HELD)"
  );
  return orderId;
};
/** Chế độ "Hủy vé": bấm ghế của đơn, mở "Hủy toàn bộ đơn vé?", chọn lý do; trả về hộp thoại. */
const openCancelDialog = async (page: Page, seat: string, orderId: number) => {
  await page.getByRole("checkbox", { name: "Hủy vé", exact: true }).check();
  await page.locator(`[data-seat-code="${seat}"]`).click();
  await page.getByRole("button", { name: "Hủy vé", exact: true }).click();
  const dialog = page.locator(".ant-modal").filter({ hasText: "Hủy toàn bộ đơn vé?" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(`Đơn #${orderId}`);
  await dialog.getByRole("combobox").click();
  await page.locator(".ant-select-item-option").filter({ hasText: "QA: khách đổi ý" }).click();
  return dialog;
};

test("P6-E2E-20 [O8] hủy đơn đang chờ QR ở sơ đồ ghế đúng lúc tiền về: hủy bị từ chối, không báo hủy thành công, đơn vẫn đã thanh toán", async ({}, testInfo) => {
  pos = await startPos(testInfo);
  const orderId = await leaveWaitingQrOrder(pos, "A1");
  const dialog = await openCancelDialog(pos.page, "A1", orderId);
  // Lệnh hủy dừng 2 s ngay trước UPDATE có điều kiện (sau bước kiểm "chưa nhận tiền"); IPN tới trong lúc đó.
  await qaApi("POST", "/__qa/api/faults", { cancelDelayMs: 2000 });
  const cancelled = pos.page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/api/pos/order/cancel"
  );
  await dialog.getByRole("button", { name: "Hủy toàn bộ đơn" }).click();
  await pos.page.waitForTimeout(300);
  expect((await pay(orderId)).body.code).toBe("00");
  const cancelResponse = await cancelled;
  const cancelBody = await cancelResponse.json().catch(() => null);
  await pos.page.waitForTimeout(1500);
  const after = snapshot(orderId);
  const cancelSuccess = await toasts(pos, /Hủy vé thành công/);
  const paidMeanwhile = await toasts(pos, /được thanh toán/);
  await evidence(testInfo, "cancel-vs-payment.json", {
    cancel: { status: cancelResponse.status(), body: cancelBody },
    db: after,
    cancelSuccess,
    paidMeanwhile,
    prints: await prints(pos),
    apiCalls: pos.apiCalls.filter((call) => /cancel|status|order\/\d+/.test(call))
  });
  expect(cancelResponse.status(), JSON.stringify(cancelBody)).toBe(409);
  expect(cancelBody?.code).toBe("PAPER_VOUCHER_QR_PAYMENT_RECEIVED");
  expect(cancelSuccess, "never 'Hủy vé thành công' for a cancel that lost to the payment").toBe(0);
  expect(paidMeanwhile, "the cashier is told the order was paid meanwhile").toBeGreaterThanOrEqual(
    1
  );
  expect(after.issues).toEqual([]);
  expect(after.snapshot.order!.orderStatusId).toBe(ORDER.COMPLETED);
  expect(after.snapshot.header!.status).toBe(HEADER.APPLIED);
  expect(after.snapshot.header!.collectedAmount).toBe(20000);
});

// ---------- O-3: server-side recovery job (một lần chạy job thật, như scheduler mỗi 30 s) ----------
const runRecovery = async (minPaidAgeSeconds = 0) => {
  const answer = await qaApi<{ recovered: number[]; failed: number[] }>(
    "POST",
    "/__qa/api/recovery/run",
    {
      minPaidAgeSeconds
    }
  );
  expect(answer.status, JSON.stringify(answer.body)).toBe(200);
  return answer.body;
};
/** Tiền đã ghi trên giao dịch QR nhưng xác nhận lỗi DB (VNPay IPN 99 / VietQR callback 500). */
const payWithDbFailure = async (orderId: number) => {
  await qaApi("POST", "/__qa/api/faults", { dbFailure: true });
  const answer = await pay(orderId);
  await expectDb(
    orderId,
    (snap) => snap.transactions[0]?.status === "success" && snap.header?.status === HEADER.HELD,
    "money recorded, voucher still HELD"
  );
  return answer;
};

test("P6-E2E-17 [R01 F06] IPN 99, thu ngân không thao tác: job hoàn tất → POS nhận socket, báo thành công và in một lần", async ({}, testInfo) => {
  pos = await startPos(testInfo);
  await selectSeats(pos.page, ["C7"]);
  await applyVouchers(pos.page, [{ code: "LÔ-901" }]);
  const { orderId, dialog } = await printForQr(pos, VNPAY);
  expect((await payWithDbFailure(orderId)).body.code).toBe("99");
  await pos.page.waitForTimeout(2000);
  await expect(dialog).toBeVisible();
  expect(await prints(pos)).toHaveLength(0);
  expect((await runRecovery()).recovered).toEqual([orderId]);
  await expect(toast(pos.page, /Thanh toán VNPayQR thành công 20\.000/)).toBeVisible({
    timeout: 20000
  });
  await expect(dialog).toHaveCount(0);
  const applied = await expectDb(
    orderId,
    (snap) => snap.header?.status === HEADER.APPLIED,
    "APPLIED by the job"
  );
  expect(applied.header!.collectedAmount).toBe(20000);
  await pos.page.waitForTimeout(3000);
  expect(await prints(pos)).toHaveLength(1);
  expect(await toasts(pos, /Thanh toán VNPayQR thành công/)).toBe(1);
});

test("P6-E2E-18 [R04] job và thu ngân bấm Kiểm tra lại cùng lúc (VietQR): báo thành công một lần, in một lần", async ({}, testInfo) => {
  pos = await startPos(testInfo);
  await selectSeats(pos.page, ["C8"]);
  await applyVouchers(pos.page, [{ code: "LÔ-901" }]);
  const { orderId, dialog } = await printForQr(pos, VIETQR);
  expect((await payWithDbFailure(orderId)).status).toBe(500);
  const recheck = dialog.getByRole("button", { name: /Kiểm tra lại giao dịch/ });
  const [click, job] = await Promise.all([
    recheck
      .click({ timeout: 5000 })
      .then(() => "recheck clicked")
      .catch(() => "QR closed by the job's socket before the click"),
    runRecovery()
  ]);
  await evidence(testInfo, "race.json", { click, job });
  await expect
    .poll(() => toasts(pos!, /Thanh toán VietQR thành công/), { timeout: 20000 })
    .toBeGreaterThan(0);
  await expect(dialog).toHaveCount(0);
  await expectDb(orderId, (snap) => snap.header?.status === HEADER.APPLIED, "APPLIED");
  await pos.page.waitForTimeout(3000);
  expect(await prints(pos)).toHaveLength(1);
  expect(await toasts(pos, /Thanh toán VietQR thành công/)).toBe(1);
});

test("P6-E2E-19 [R01] POS đã tắt khi IPN 99: job hoàn tất; mở lại app, Lịch sử bán vé thấy Hoàn thành", async ({}, testInfo) => {
  pos = await startPos(testInfo);
  await selectSeats(pos.page, ["F1"]);
  await applyVouchers(pos.page, [{ code: "LÔ-901" }]);
  const { orderId } = await printForQr(pos, VNPAY);
  await pos.app.evaluate(({ app }) => app.exit(0)).catch(() => undefined);
  await pos.app.close().catch(() => undefined);
  expect((await payWithDbFailure(orderId)).body.code).toBe("99");
  expect((await runRecovery()).recovered).toEqual([orderId]);
  const applied = await expectDb(
    orderId,
    (snap) => snap.header?.status === HEADER.APPLIED,
    "APPLIED by the job"
  );
  expect(applied.order!.orderStatusId).toBe(ORDER.COMPLETED);
  pos = await launch(testInfo);
  await login(pos.page);
  await pos.page.evaluate(() => {
    window.location.hash = "#/order-history";
  });
  const row = pos.page
    .locator("tr.ant-table-row")
    .filter({ has: pos.page.getByText(String(orderId), { exact: true }) });
  await expect(row).toBeVisible({ timeout: 20000 });
  await expect(row).toContainText("Hoàn thành");
  await pos.page.screenshot({ path: testInfo.outputPath("history-after-recovery.png") });
});

test("P6-E2E-11 [E02 F06] mất kết nối khi chờ thanh toán: QR giữ nguyên; tiền về lúc offline; online → Kiểm tra lại → in một lần", async ({}, testInfo) => {
  pos = await startPos(testInfo);
  await selectSeats(pos.page, ["B3"]);
  await applyVouchers(pos.page, [{ code: "LÔ-901" }]);
  const { orderId, dialog } = await printForQr(pos, VNPAY);
  await qaApi("POST", "/__qa/api/offline", { offline: true });
  await dialog.getByRole("button", { name: "Kết thúc" }).click();
  await expect(dialog).toBeVisible();
  await expect
    .poll(() => toasts(pos!, /Chưa kết thúc được QR|Không nhận được phản hồi|Network/))
    .toBeGreaterThan(0);
  const held = snapshot(orderId).snapshot;
  expect(held.header!.status).toBe(HEADER.HELD);
  expect((await pay(orderId)).body.code).toBe("00");
  await expectDb(
    orderId,
    (snap) => snap.header?.status === HEADER.APPLIED,
    "APPLIED by the IPN while the POS is offline"
  );
  await pos.page.waitForTimeout(2000);
  await expect(dialog).toBeVisible();
  expect(await prints(pos)).toHaveLength(0);
  await qaApi("POST", "/__qa/api/offline", { offline: false });
  await dialog.getByRole("button", { name: /Kiểm tra lại giao dịch/ }).click();
  await expect(toast(pos.page, /Thanh toán VNPayQR thành công 20\.000/)).toBeVisible({
    timeout: 30000
  });
  await expect(dialog).toHaveCount(0);
  await expect.poll(async () => (await prints(pos!)).length, { timeout: 15000 }).toBe(1);
});

const postOrderCount = async () =>
  (await qaApi<{ requestCounts: Record<string, number> }>("GET", "/__qa/api/calls")).body
    .requestCounts["POST /api/pos/order"] ?? 0;

// Ngắt kết nối phía máy POS (Playwright chặn ở renderer): Chromium không tự gửi lại, app nhận lỗi mạng.
// Ngắt phía server (đóng socket keep-alive trước khi trả lời) thì Chromium tự gửi lại: ca 12c.
const failNextOrderPost = (page: Page, afterServer: boolean) =>
  page.route(
    `${QA_BASE}/api/pos/order`,
    async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      if (afterServer) await route.fetch(); // backend ghi đơn, câu trả lời không về tới POS
      return route.abort("connectionreset");
    },
    { times: 1 }
  );

test("P6-E2E-12a [E01 E09] mất kết nối trước khi request tạo đơn tới server → chưa có đơn; bấm lại In vé → đúng một đơn", async ({}, testInfo) => {
  pos = await startPos(testInfo);
  const before = usedCount("LÔ-901");
  await selectSeats(pos.page, ["B4"]);
  await applyVouchers(pos.page, [{ code: "LÔ-901" }]);
  await checkQr(pos.page, VIETQR);
  await failNextOrderPost(pos.page, false);
  await printButton(pos.page).click();
  await expect
    .poll(() => toasts(pos!, /Không nhận được phản hồi từ máy chủ/), { timeout: 20000 })
    .toBe(1);
  await expect(qrDialog(pos.page)).toHaveCount(0);
  expect(qaOrderIds()).toEqual([]);
  expect(usedCount("LÔ-901")).toBe(before);
  await printButton(pos.page).click();
  await expect(qrDialog(pos.page)).toBeVisible({ timeout: 30000 });
  await expect.poll(() => qaOrderIds().length).toBe(1);
  const [orderId] = qaOrderIds();
  const held = await expectDb(
    orderId,
    (snap) => snap.header?.status === HEADER.HELD && snap.transactions.length === 1,
    "one HELD order with one QR"
  );
  expect(usedCount("LÔ-901")).toBe(before + 1);
  expect((await qrAmounts(pos.page)).payable).toBe(20000);
  await evidence(testInfo, "order-responses.json", {
    orderResponses: pos.orderResponses,
    held,
    serverPosts: await postOrderCount()
  });
});

/** Đơn đã ghi nhưng POS không nhận được trả lời: tới lúc thu ngân bấm lại, đơn là HELD, chưa có QR. */
const loseCommittedOrderResponse = async (seat: string) => {
  await selectSeats(pos!.page, [seat]);
  await applyVouchers(pos!.page, [{ code: "LÔ-901" }]);
  await checkQr(pos!.page, VIETQR);
  await failNextOrderPost(pos!.page, true);
  await printButton(pos!.page).click();
  await expect
    .poll(() => toasts(pos!, /Không nhận được phản hồi từ máy chủ/), { timeout: 20000 })
    .toBe(1);
  await expect.poll(() => qaOrderIds().length).toBe(1);
  const [orderId] = qaOrderIds();
  const held = await expectDb(
    orderId,
    (snap) => snap.header?.status === HEADER.HELD,
    "committed order HELD"
  );
  expect(held.transactions).toHaveLength(0);
  await expect(qrDialog(pos!.page)).toHaveCount(0);
  return orderId;
};

// P5/P6 (paperVoucherSale `retryable`): gửi lại y nguyên cùng mã → backend trả lại đơn đã tạo.
test("P6-E2E-12b [E01 E09] đơn đã ghi nhưng response bị mất → bấm lại In vé gửi y nguyên → backend trả đơn cũ, mở QR, không đơn trùng", async ({}, testInfo) => {
  pos = await startPos(testInfo);
  const before = usedCount("LÔ-901");
  const orderId = await loseCommittedOrderResponse("B4");
  await printButton(pos.page).click();
  await expect(qrDialog(pos.page)).toBeVisible({ timeout: 30000 });
  expect(pos.orderResponses.map((answer) => answer.id)).toEqual([orderId]);
  expect(await qrAmounts(pos.page)).toEqual({
    ticketTotal: 100000,
    voucherApplied: 80000,
    payable: 20000
  });
  expect(qaOrderIds(), "no duplicate order").toEqual([orderId]);
  await expectDb(
    orderId,
    (snap) => snap.header?.status === HEADER.HELD && snap.transactions.length === 1,
    "one QR for the existing order"
  );
  expect(usedCount("LÔ-901")).toBe(before + 1);
  expect((await pay(orderId)).status).toBe(201);
  await expect(toast(pos.page, /Thanh toán VietQR thành công 20\.000/)).toBeVisible({
    timeout: 20000
  });
  await expectDb(orderId, (snap) => snap.header?.status === HEADER.APPLIED, "APPLIED");
  await expect.poll(async () => (await prints(pos!)).length).toBe(1);
  await evidence(testInfo, "lost-response.json", {
    orderId,
    orderResponses: pos.orderResponses,
    serverPosts: await postOrderCount()
  });
});

// Tài liệu P6 mục 6: lựa chọn khác sau lỗi → tra requestId cũ; đơn held chỉ được báo, không tự mở QR, không bán đơn mới.
test("P6-E2E-12d [E01 E09] response bị mất rồi thu ngân đổi lựa chọn → app tra requestId, báo đơn cũ đang chờ, không tạo đơn mới", async ({}, testInfo) => {
  pos = await startPos(testInfo);
  const orderId = await loseCommittedOrderResponse("B4");
  // B4 đã thuộc đơn đang chờ (báo giá lại cho B4 bị từ chối): thu ngân bỏ B4, chọn ghế khác.
  const seatB4 = pos.page.locator('[data-seat-code="B4"]');
  await seatB4.click();
  await expect(seatB4).not.toHaveAttribute("data-seat-selection-state", "confirmed");
  await selectSeats(pos.page, ["B6"]);
  await expect(printButton(pos.page)).toBeEnabled({ timeout: 20000 });
  await printButton(pos.page).click();
  await expect
    .poll(() => toasts(pos!, new RegExp(`Lần bán trước đã tạo đơn #${orderId}`)), {
      timeout: 20000
    })
    .toBe(1);
  await expect(qrDialog(pos.page)).toHaveCount(0);
  await pos.page.waitForTimeout(2000);
  expect(qaOrderIds(), "no second order").toEqual([orderId]);
  expect(snapshot(orderId).snapshot.header!.status).toBe(HEADER.HELD);
  await evidence(testInfo, "reconcile.json", {
    orderId,
    apiCalls: pos.apiCalls.filter((call) =>
      /paper-voucher-requests|POST \/api\/pos\/order/.test(call)
    )
  });
});

test("P6-E2E-12c [E09] response tạo đơn mất một lần: Chromium tự gửi lại, backend trả lại đơn cũ (replay) → một đơn", async ({}, testInfo) => {
  pos = await startPos(testInfo);
  await selectSeats(pos.page, ["B7"]);
  await applyVouchers(pos.page, [{ code: "LÔ-901" }]);
  await checkQr(pos.page, VIETQR);
  await qaApi("POST", "/__qa/api/faults", {
    dropResponse: { method: "POST", path: "/api/pos/order", count: 1 }
  });
  await printButton(pos.page).click();
  await expect(qrDialog(pos.page)).toBeVisible({ timeout: 30000 });
  const serverPosts = await postOrderCount();
  await evidence(testInfo, "resend.json", {
    serverPosts,
    orderResponses: pos.orderResponses,
    orders: qaOrderIds()
  });
  expect(serverPosts, "the backend received the order twice (transport-level resend)").toBe(2);
  expect(pos.orderResponses).toHaveLength(1);
  expect(qaOrderIds()).toHaveLength(1);
  const [orderId] = qaOrderIds();
  await expectDb(
    orderId,
    (snap) => snap.header?.status === HEADER.HELD && snap.transactions.length === 1,
    "one HELD order with one QR"
  );
});

test("P6-E2E-13 [E05] Redis lỗi khi tạo QR: đơn tạo xong nhưng QR không mở; app đóng đơn → FAIL + RELEASED", async ({}, testInfo) => {
  pos = await startPos(testInfo);
  const before = usedCount("LÔ-901");
  await selectSeats(pos.page, ["B6"]);
  await applyVouchers(pos.page, [{ code: "LÔ-901" }]);
  await checkQr(pos.page, VIETQR);
  await qaApi("POST", "/__qa/api/faults", {
    redis: { mode: "error", keyPrefix: "paper-voucher:qr-creation:" }
  });
  await printButton(pos.page).click();
  await expect.poll(() => qaOrderIds().length, { timeout: DB_TIMEOUT }).toBe(1);
  const [orderId] = qaOrderIds();
  const released = await expectDb(
    orderId,
    (snap) => snap.header?.status === HEADER.RELEASED,
    "RELEASED after the QR could not be created"
  );
  expect(released.transactions).toHaveLength(0);
  await expect(qrDialog(pos.page)).toHaveCount(0);
  expect(usedCount("LÔ-901")).toBe(before);
  expect(await prints(pos)).toHaveLength(0);
});

test("P6-E2E-14 [F01] tiền mặt P5: 1 vé + LÔ-902 → thu 50.000, APPLIED, in một lần", async ({}, testInfo) => {
  pos = await startPos(testInfo);
  await selectSeats(pos.page, ["C1"]);
  expect(digits(await applyVouchers(pos.page, [{ code: "LÔ-902" }]))).toBe(50000);
  await printButton(pos.page).click();
  await expect.poll(() => pos!.orderResponses.length).toBe(1);
  const orderId = pos.orderResponses[0].id!;
  const applied = await expectDb(
    orderId,
    (snap) => snap.header?.status === HEADER.APPLIED,
    "APPLIED (cash)"
  );
  expect([
    applied.order!.paymentMethodSystemName,
    applied.order!.orderTotal,
    applied.header!.collectedAmount
  ]).toEqual(["POS", 100000, 50000]);
  expect(applied.transactions).toHaveLength(0);
  await expect.poll(async () => (await prints(pos!)).length).toBe(1);
  await expect(pos.page.getByTestId("last-sale-total")).toContainText("100.000");
});

test("P6-E2E-15 [F05] Lịch sử bán vé hiển thị đúng trạng thái DB (hoàn thành / đang chờ / thất bại)", async ({}, testInfo) => {
  pos = await startPos(testInfo);
  await selectSeats(pos.page, ["C2"]);
  await applyVouchers(pos.page, [{ code: "LÔ-901" }]);
  const paid = await printForQr(pos, VNPAY);
  expect((await pay(paid.orderId)).body.code).toBe("00");
  await expect(paid.dialog).toHaveCount(0, { timeout: 20000 });
  await selectSeats(pos.page, ["C3"]);
  await applyVouchers(pos.page, [{ code: "LÔ-901" }]);
  const closed = await printForQr(pos, VIETQR);
  await closed.dialog.getByRole("button", { name: "Kết thúc" }).click();
  await expect(closed.dialog).toHaveCount(0);
  // Màn bán vé mới (Kết thúc không bỏ chọn ghế/voucher của lần bán trước).
  await pos.page.reload();
  await openScreening(pos.page);
  await selectSeats(pos.page, ["C4"]);
  await applyVouchers(pos.page, [{ code: "LÔ-901" }]);
  const waiting = await printForQr(pos, VIETQR);
  // Đơn thứ ba để chờ: rời màn bán vé (không bấm Kết thúc / Esc, vì cả hai đều đóng QR).
  const expected: Record<number, string> = {
    [paid.orderId]: "Hoàn thành",
    [closed.orderId]: "Thất bại",
    [waiting.orderId]: "Đang chờ"
  };
  const dbStatus = {
    [paid.orderId]: ORDER.COMPLETED,
    [closed.orderId]: ORDER.FAIL,
    [waiting.orderId]: ORDER.PENDING
  };
  for (const [orderId, status] of Object.entries(dbStatus)) {
    await expectDb(
      Number(orderId),
      (snap) => snap.order?.orderStatusId === status,
      `order ${orderId} status ${status}`
    );
  }
  await pos.page.evaluate(() => {
    window.location.hash = "#/order-history";
  });
  for (const [orderId, label] of Object.entries(expected)) {
    const row = pos.page
      .locator("tr.ant-table-row")
      .filter({ has: pos.page.getByText(orderId, { exact: true }) });
    await expect(row).toBeVisible({ timeout: 20000 });
    await expect(row).toContainText(label);
  }
  await pos.page.screenshot({ path: testInfo.outputPath("order-history.png") });
  expect(
    snapshot(waiting.orderId).snapshot.header!.status,
    "leaving the sale screen does not close the waiting QR"
  ).toBe(HEADER.HELD);
});

// ---------- O-8 HTTP contract: trạng thái đơn lúc thu ngân BẮT ĐẦU hủy (chọn đơn trên sơ đồ ghế) ----------
type CancelAttempt = {
  sent: { orderIds?: number[]; expectedOrderStatusId?: number; isRefund?: boolean } | null;
  status: number;
  body: { code?: string; message?: string } | null;
};
/** Bấm "Hủy toàn bộ đơn": body đã gửi + câu trả lời của backend. */
const confirmCancel = async (
  pos: Pos,
  dialog: ReturnType<Page["locator"]>
): Promise<CancelAttempt> => {
  const isCancel = (url: string) => new URL(url).pathname === "/api/pos/order/cancel";
  const request = pos.page.waitForRequest(
    (candidate) => isCancel(candidate.url()) && candidate.method() === "POST"
  );
  const response = pos.page.waitForResponse((candidate) => isCancel(candidate.url()));
  await dialog.getByRole("button", { name: "Hủy toàn bộ đơn" }).click();
  const sent = (await request).postDataJSON();
  const answer = await response;
  return { sent, status: answer.status(), body: await answer.json().catch(() => null) };
};
const cancelRequestCount = (pos: Pos) =>
  pos.apiCalls.filter((call) => / POST \/api\/pos\/order\/cancel → /.test(call)).length;
const CANCEL_PAID_MEANWHILE = /đã được thanh toán trong lúc bạn thao tác hủy/;

/** Hủy bị từ chối vì đơn đã được thanh toán sau khi thu ngân bắt đầu hủy: kiểm UI + DB. */
const expectPaidMeanwhileRefusal = async (
  pos: Pos,
  testInfo: TestInfo,
  orderId: number,
  attempt: CancelAttempt
) => {
  // Chờ câu trả lời được xử lý (tải lại đơn, thông báo) và đủ lâu để thấy nếu app tự gửi lại lệnh hủy.
  await pos.page.waitForTimeout(3000);
  const after = snapshot(orderId);
  const shown = await pos.page.evaluate(() =>
    (window as unknown as { qaToasts: { text: string }[] }).qaToasts.map((item) => item.text)
  );
  await evidence(testInfo, "cancel-refused.json", {
    attempt,
    db: after,
    toasts: shown,
    cancelRequests: cancelRequestCount(pos),
    apiCalls: pos.apiCalls.filter((call) => /cancel|get-by-screens|order\/\d+/.test(call))
  });
  expect(attempt.sent?.expectedOrderStatusId, "status of the start of the cancel").toBe(
    ORDER.PENDING
  );
  expect(attempt.status, JSON.stringify(attempt.body)).toBe(409);
  expect(attempt.body?.code).toBe("PAPER_VOUCHER_QR_PAYMENT_RECEIVED");
  expect(await toasts(pos, /Hủy vé thành công/), "no success for a refused cancel").toBe(0);
  expect(shown.find((text) => CANCEL_PAID_MEANWHILE.test(text))).toContain("in lại vé");
  expect(cancelRequestCount(pos), "the cancel is never re-sent").toBe(1);
  // Hộp hủy dùng forceRender: đóng = ẩn (vẫn trong DOM), không phải bị gỡ.
  await expect(
    pos.page.locator(".ant-modal").filter({ hasText: "Hủy toàn bộ đơn vé?" })
  ).toBeHidden();
  expect(after.issues).toEqual([]);
  expect(after.snapshot.order!.orderStatusId).toBe(ORDER.COMPLETED);
  expect(after.snapshot.header!.status).toBe(HEADER.APPLIED);
  expect(after.snapshot.header!.collectedAmount).toBe(20000);
};

test("P6-E2E-21 [O8] hộp hủy mở khi đơn đang chờ, IPN trả tiền trong lúc hộp mở rồi bấm hủy: không hủy, hướng dẫn in lại vé; hủy mới theo trạng thái mới thì được", async ({}, testInfo) => {
  pos = await startPos(testInfo);
  const orderId = await leaveWaitingQrOrder(pos, "A1");
  const dialog = await openCancelDialog(pos.page, "A1", orderId);
  expect((await pay(orderId)).body.code).toBe("00");
  await expectDb(
    orderId,
    (snap) => snap.header?.status === HEADER.APPLIED,
    "paid while the dialog is open"
  );
  await pos.page.waitForTimeout(1500); // sự kiện thanh toán làm POS tải lại danh sách đơn; hộp hủy vẫn mở
  const refreshed = pos.page.waitForResponse((response) =>
    new URL(response.url()).pathname.startsWith("/api/pos/order/get-by-screens/")
  );
  const attempt = await confirmCancel(pos, dialog);
  await expectPaidMeanwhileRefusal(pos, testInfo, orderId, attempt);
  await refreshed;
  // Thu ngân vẫn muốn hủy đơn đã trả: một hành động hủy MỚI, theo trạng thái đã làm mới.
  const again = await openCancelDialog(pos.page, "A1", orderId);
  const second = await confirmCancel(pos, again);
  await evidence(testInfo, "cancel-again.json", { second, db: snapshot(orderId) });
  expect(second.sent?.expectedOrderStatusId).toBe(ORDER.COMPLETED);
  expect(second.status, JSON.stringify(second.body)).toBe(201);
  await expect(toast(pos.page, "Hủy vé thành công")).toBeVisible({ timeout: 10000 });
  const cancelled = await expectDb(orderId, (snap) => snap.header?.status === 30, "CANCELLED");
  expect(cancelled.order!.orderStatusId).toBe(ORDER.FAIL);
});

test("P6-E2E-22 [O8 R01] hộp hủy mở khi đơn đang chờ, IPN 99 rồi job O-3 hoàn tất trước khi bấm hủy: không hủy, hướng dẫn in lại vé", async ({}, testInfo) => {
  pos = await startPos(testInfo);
  const orderId = await leaveWaitingQrOrder(pos, "A1");
  const dialog = await openCancelDialog(pos.page, "A1", orderId);
  await payWithDbFailure(orderId);
  expect((await runRecovery()).recovered).toContain(orderId);
  await expectDb(orderId, (snap) => snap.header?.status === HEADER.APPLIED, "completed by the job");
  await pos.page.waitForTimeout(1500);
  const attempt = await confirmCancel(pos, dialog);
  await expectPaidMeanwhileRefusal(pos, testInfo, orderId, attempt);
});

test("P6-E2E-23 [O8] đơn đang chờ không nhận tiền: hủy thành công, gửi trạng thái lúc bắt đầu, voucher trả lại", async ({}, testInfo) => {
  pos = await startPos(testInfo);
  const orderId = await leaveWaitingQrOrder(pos, "A1");
  const dialog = await openCancelDialog(pos.page, "A1", orderId);
  const attempt = await confirmCancel(pos, dialog);
  await evidence(testInfo, "cancel-waiting.json", { attempt });
  expect(attempt.sent).toMatchObject({ orderIds: [orderId], expectedOrderStatusId: ORDER.PENDING });
  expect(attempt.status, JSON.stringify(attempt.body)).toBe(201);
  await expect(toast(pos.page, "Hủy vé thành công")).toBeVisible({ timeout: 10000 });
  const released = await expectDb(
    orderId,
    (snap) => snap.header?.status === HEADER.RELEASED,
    "RELEASED"
  );
  expect(released.order!.orderStatusId).toBe(ORDER.FAIL);
  expect(await prints(pos)).toHaveLength(0);
});

test("P6-E2E-24 [O8 F03] hộp hủy mở khi đơn đã thanh toán: hủy + hoàn tiền theo nghiệp vụ hiện có (= tiền khách trả thêm)", async ({}, testInfo) => {
  pos = await startPos(testInfo);
  await selectSeats(pos.page, ["A1"]);
  await applyVouchers(pos.page, [{ code: "LÔ-901" }]);
  const { orderId, dialog: qr } = await printForQr(pos, VNPAY);
  expect((await pay(orderId)).body.code).toBe("00");
  await expect(qr).toHaveCount(0, { timeout: 20000 });
  await expectDb(orderId, (snap) => snap.header?.status === HEADER.APPLIED, "APPLIED");
  const dialog = await openCancelDialog(pos.page, "A1", orderId);
  await dialog.getByRole("checkbox", { name: "Hủy vé hoàn tiền" }).check();
  const attempt = await confirmCancel(pos, dialog);
  await evidence(testInfo, "cancel-paid.json", { attempt });
  expect(attempt.sent).toMatchObject({
    orderIds: [orderId],
    expectedOrderStatusId: ORDER.COMPLETED,
    isRefund: true
  });
  expect(attempt.status, JSON.stringify(attempt.body)).toBe(201);
  await expect(toast(pos.page, "Hủy vé thành công")).toBeVisible({ timeout: 10000 });
  const cancelled = await expectDb(orderId, (snap) => snap.header?.status === 30, "CANCELLED");
  expect(cancelled.order!.orderStatusId).toBe(ORDER.FAIL);
  expect(cancelled.header!.collectedAmount).toBe(20000);
  expect((cancelled.order as unknown as { refundedAmount: number }).refundedAmount).toBe(20000);
});

test("P6-E2E-25 [O8 E04] IPN 99 rồi thu ngân hủy đơn đang chờ: không hủy, báo đã nhận tiền đang chờ hoàn tất, voucher vẫn giữ", async ({}, testInfo) => {
  pos = await startPos(testInfo);
  const orderId = await leaveWaitingQrOrder(pos, "A1");
  await payWithDbFailure(orderId);
  await pos.page.reload();
  await openScreening(pos.page);
  const dialog = await openCancelDialog(pos.page, "A1", orderId);
  const attempt = await confirmCancel(pos, dialog);
  await pos.page.waitForTimeout(3000);
  const after = snapshot(orderId);
  const shown = await pos.page.evaluate(() =>
    (window as unknown as { qaToasts: { text: string }[] }).qaToasts.map((item) => item.text)
  );
  await evidence(testInfo, "cancel-after-ipn99.json", {
    attempt,
    db: after,
    toasts: shown,
    cancelRequests: cancelRequestCount(pos)
  });
  expect(attempt.sent?.expectedOrderStatusId).toBe(ORDER.PENDING);
  expect(attempt.status).toBe(409);
  expect(attempt.body?.code).toBe("PAPER_VOUCHER_QR_PAYMENT_RECEIVED");
  expect(shown.some((text) => /đã nhận tiền QR và đang chờ/.test(text))).toBe(true);
  expect(await toasts(pos, /Hủy vé thành công/)).toBe(0);
  expect(cancelRequestCount(pos)).toBe(1);
  expect(after.issues).toEqual([]);
  expect(after.snapshot.order!.orderStatusId).toBe(ORDER.PENDING);
  expect(after.snapshot.header!.status).toBe(HEADER.HELD);
  expect(after.snapshot.transactions[0].status).toBe("success");
});

test("P6-E2E-26 [O8] Lịch sử bán vé: mở 'Hủy vé' trên đơn đã nhận tiền (IPN 99), job O-3 hoàn tất trước khi xác nhận: không hủy, hướng dẫn in lại vé", async ({}, testInfo) => {
  pos = await startPos(testInfo);
  const orderId = await leaveWaitingQrOrder(pos, "A1");
  await payWithDbFailure(orderId);
  await pos.page.evaluate(() => {
    window.location.hash = "#/order-history";
  });
  const row = pos.page
    .locator("tr.ant-table-row")
    .filter({ has: pos.page.getByText(String(orderId), { exact: true }) });
  await expect(row).toBeVisible({ timeout: 20000 });
  // Danh sách đã tải trước IPN 99 nằm trong cache (staleTime 60 s): thu ngân bấm "Làm mới".
  const listed = pos.page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/pos/order" && response.request().method() === "GET"
  );
  await pos.page.getByRole("button", { name: "Làm mới" }).click();
  await listed;
  await row.locator(".anticon-more").click();
  await pos.page.getByRole("menuitem", { name: "Hủy vé" }).click();
  const dialog = pos.page.locator(".ant-modal").filter({ hasText: "Xác nhận hủy vé" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("combobox").click();
  await pos.page.locator(".ant-select-item-option").filter({ hasText: "QA: khách đổi ý" }).click();
  // Hộp đang mở: job O-3 hoàn tất đơn (COMPLETED + APPLIED) trước khi thu ngân xác nhận.
  expect((await runRecovery()).recovered).toContain(orderId);
  await expectDb(orderId, (snap) => snap.header?.status === HEADER.APPLIED, "completed by the job");
  const isCancel = (url: string) => new URL(url).pathname === "/api/pos/order/cancel";
  const request = pos.page.waitForRequest(
    (candidate) => isCancel(candidate.url()) && candidate.method() === "POST"
  );
  const response = pos.page.waitForResponse((candidate) => isCancel(candidate.url()));
  await dialog.getByRole("button", { name: "Xác nhận" }).click();
  const attempt: CancelAttempt = {
    sent: (await request).postDataJSON(),
    status: (await response).status(),
    body: await (await response).json().catch(() => null)
  };
  await pos.page.waitForTimeout(3000);
  const after = snapshot(orderId);
  const shown = await pos.page.evaluate(() =>
    (window as unknown as { qaToasts: { text: string }[] }).qaToasts.map((item) => item.text)
  );
  await evidence(testInfo, "history-cancel-refused.json", {
    attempt,
    db: after,
    toasts: shown,
    cancelRequests: cancelRequestCount(pos)
  });
  expect(attempt.sent?.expectedOrderStatusId, "status of the row when the dialog opened").toBe(
    ORDER.PENDING
  );
  expect(attempt.status, JSON.stringify(attempt.body)).toBe(409);
  expect(attempt.body?.code).toBe("PAPER_VOUCHER_QR_PAYMENT_RECEIVED");
  expect(await toasts(pos, /Hủy vé thành công/)).toBe(0);
  expect(shown.find((text) => CANCEL_PAID_MEANWHILE.test(text))).toContain("in lại vé");
  expect(cancelRequestCount(pos)).toBe(1);
  await expect(dialog).toBeHidden();
  expect(after.issues).toEqual([]);
  expect(after.snapshot.order!.orderStatusId).toBe(ORDER.COMPLETED);
  expect(after.snapshot.header!.status).toBe(HEADER.APPLIED);
  expect(after.snapshot.header!.collectedAmount).toBe(20000);
});

test("P6-E2E-27 [B1 E04] bấm Kết thúc đúng lúc tiền về nhưng xác nhận lỗi (IPN 99): không trả voucher; app hoàn tất, báo thành công và in một lần", async ({}, testInfo) => {
  pos = await startPos(testInfo);
  await selectSeats(pos.page, ["C6"]);
  await applyVouchers(pos.page, [{ code: "LÔ-901" }]);
  const { orderId, dialog } = await printForQr(pos, VNPAY);
  // Lệnh đóng QR dừng 2 s sau bước kiểm "chưa nhận tiền"; IPN ghi tiền nhưng xác nhận lỗi DB trong lúc đó.
  await qaApi("POST", "/__qa/api/faults", { closeDelayMs: 2000 });
  await dialog.getByRole("button", { name: "Kết thúc" }).click();
  await pos.page.waitForTimeout(300);
  await qaApi("POST", "/__qa/api/faults", { dbFailure: true });
  expect((await pay(orderId)).body.code).toBe("99");
  await expect(dialog).toHaveCount(0, { timeout: 20000 });
  await pos.page.waitForTimeout(3000);
  const after = snapshot(orderId);
  const released = await toasts(pos, /voucher giấy đã được trả lại/);
  const paid = await toasts(pos, /Thanh toán VNPayQR thành công 20\.000/);
  await evidence(testInfo, "close-vs-ipn99.json", {
    db: after,
    released,
    paid,
    prints: await prints(pos),
    apiCalls: pos.apiCalls.filter((call) => /status|order\/\d+/.test(call))
  });
  expect(
    released,
    "never 'voucher returned / no ticket' for an order whose money was received"
  ).toBe(0);
  expect(after.issues).toEqual([]);
  expect(after.snapshot.header!.status).toBe(HEADER.APPLIED);
  expect(after.snapshot.header!.collectedAmount).toBe(20000);
  expect(paid).toBe(1);
  expect(await prints(pos)).toHaveLength(1);
});
