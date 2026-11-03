/**
 * E2E Voucher giấy: Electron → NestJS (pvtest, local) → SQL Server `NCC_PaperVoucher_Test`.
 *
 * Opt-in, chỉ chạy với backend local và DB test. Cần:
 *   - App đã build (vd. `npx electron-vite build`).
 *   - Backend: `test/paper-voucher/pvtest-server.js` của ncc-online-be-nestjs (xem README cùng thư mục;
 *     tài khoản được seed và cấp quyền qua API bằng `seed-staff.pvtest.js`, `grant-permissions.pvtest.js`).
 *   - `sqlcmd` + Windows auth tới SQL Server local để đối chiếu dữ liệu đã ghi.
 *   - Env: E2E_PV_MANAGER_USERNAME/PASSWORD, E2E_PV_VIEWER_USERNAME/PASSWORD,
 *          E2E_PV_NOACCESS_USERNAME/PASSWORD, E2E_PV_SQL_DATABASE=NCC_PaperVoucher_Test.
 *
 * Không chạy với server khác loopback hoặc DB khác `NCC_PaperVoucher_Test`.
 */
import {
  _electron as electron,
  expect,
  test,
  type ElectronApplication,
  type Page,
  type Response
} from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const API_BASE = process.env.E2E_PV_API_BASE || "http://127.0.0.1:3000";
const SQL_DATABASE = process.env.E2E_PV_SQL_DATABASE;
const ACCOUNTS = {
  manager: {
    username: process.env.E2E_PV_MANAGER_USERNAME,
    password: process.env.E2E_PV_MANAGER_PASSWORD
  },
  viewer: {
    username: process.env.E2E_PV_VIEWER_USERNAME,
    password: process.env.E2E_PV_VIEWER_PASSWORD
  },
  noAccess: {
    username: process.env.E2E_PV_NOACCESS_USERNAME,
    password: process.env.E2E_PV_NOACCESS_PASSWORD
  }
};
const EXPECTED_DATABASE = "NCC_PaperVoucher_Test";
const runId = Date.now().toString(36).toUpperCase();
const PREFIX = `E2E PV ${runId}`;
const PV_API = "/api/pos/paper-vouchers";

const isConfigured =
  SQL_DATABASE === EXPECTED_DATABASE &&
  /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(API_BASE) &&
  Object.values(ACCOUNTS).every((account) => account.username && account.password);

test.skip(!isConfigured, "Chỉ chạy khi cấu hình backend pvtest local và DB NCC_PaperVoucher_Test");
test.describe.configure({ mode: "serial" });

type Batch = { id: number; batchCode: string; name: string; faceValue: number };

// ---------- SQL Server (đọc/đối chiếu, chỉ trên DB test) ----------
const sql = (query: string): string[][] => {
  const guarded = `SET NOCOUNT ON; IF DB_NAME() <> N'${EXPECTED_DATABASE}' THROW 50001, N'Wrong database', 1; ${query}`;
  const output = execFileSync(
    "sqlcmd",
    [
      "-S",
      "localhost",
      "-I", // QUOTED_IDENTIFIER ON: bắt buộc khi ghi bảng có filtered index (PaperVoucherUsage)
      "-I",
      "-C",
      "-b",
      "-W",
      "-h",
      "-1",
      "-s",
      "|",
      "-d",
      EXPECTED_DATABASE,
      "-Q",
      guarded
    ],
    { encoding: "utf8" }
  );
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split("|"));
};

// Cột NVARCHAR đọc dạng hex UTF-16LE: console sqlcmd trên Windows làm mất dấu tiếng Việt.
const nvarchar = (column: string) =>
  `CONVERT(varchar(max), CONVERT(varbinary(max), ISNULL(${column}, N'')), 2)`;
const decodeNvarchar = (hex: string) => Buffer.from(hex, "hex").toString("utf16le");

const dbBatch = (id: number) => {
  const [rawRow] = sql(
    `SELECT ${nvarchar("Name")}, FaceValue, TotalQuantity, CONVERT(char(10), ExpiresAt, 23), IsLocked, Deleted, ${nvarchar("CreatedBy")}, ${nvarchar("UpdatedBy")}, ${nvarchar("LockedBy")}, ${nvarchar("BatchCode")} FROM dbo.PaperVoucherBatch WHERE Id = ${Number(id)}`
  );
  if (!rawRow) return null;
  const row = rawRow.map((value, index) =>
    [0, 6, 7, 8, 9].includes(index) ? decodeNvarchar(value) : value
  );
  if (!row) return null;
  const [
    name,
    faceValue,
    totalQuantity,
    expiresAt,
    isLocked,
    deleted,
    createdBy,
    updatedBy,
    lockedBy,
    batchCode
  ] = row;
  return {
    name,
    faceValue: Number(faceValue),
    totalQuantity: Number(totalQuantity),
    expiresAt: expiresAt === "NULL" ? null : expiresAt,
    isLocked: isLocked === "1",
    deleted: deleted === "1",
    createdBy,
    updatedBy,
    lockedBy,
    batchCode
  };
};

// ---------- API thật (chỉ để dựng dữ liệu nền và đối chiếu) ----------
const apiCall = async <T>(method: string, url: string, token?: string, body?: unknown) => {
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

const apiLogin = async (account: { username?: string; password?: string }) => {
  const { body } = await apiCall<{ access_token: string }>(
    "POST",
    "/api/pos/staff/login",
    undefined,
    {
      username: account.username,
      password: account.password
    }
  );
  return body.access_token;
};

// ---------- Electron ----------
type Session = { app: ElectronApplication; page: Page; responses: Response[] };

const launch = async (profileDir: string): Promise<Session> => {
  await mkdir(profileDir, { recursive: true });
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
    args: [`--user-data-dir=${profileDir}`, "."],
    cwd: process.cwd(),
    env
  });
  const page = await app.firstWindow();
  await app.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    window.setKiosk(false);
    window.setFullScreen(false);
    window.setBounds({ x: 0, y: 0, width: 1500, height: 950 });
  });
  const responses: Response[] = [];
  page.on("response", (response) => {
    if (response.url().includes(PV_API)) responses.push(response);
  });
  return { app, page, responses };
};

// Thoát thẳng, bỏ qua hộp thoại xác nhận thoát của main process.
const quit = (session: Session) =>
  session.app.evaluate(({ app }) => app.exit(0)).catch(() => undefined);

const login = async (page: Page, account: { username?: string; password?: string }) => {
  await expect(page.getByRole("heading", { name: "Chào mừng trở lại" })).toBeVisible({
    timeout: 60000
  });
  await page.getByLabel("Tên đăng nhập").fill(account.username!);
  await page.getByLabel("Mật khẩu").fill(account.password!);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).not.toHaveURL(/#\/login/, { timeout: 30000 });
};

const openVouchers = async (page: Page) => {
  const listed = page.waitForResponse(
    (response) =>
      response.url().includes(`${PV_API}/batches?`) && response.request().method() === "GET"
  );
  await page.evaluate(() => {
    window.location.hash = "#/vouchers";
  });
  expect((await listed).status()).toBe(200);
  await expect(page.getByText("Tổng số lô")).toBeVisible();
};

const waitApi = (page: Page, method: string, pattern: RegExp) =>
  page.waitForResponse(
    (response) =>
      response.request().method() === method && pattern.test(new URL(response.url()).pathname)
  );

// Thông báo antd (message): so khớp đúng toàn bộ nội dung, không phụ thuộc class nội bộ theo phiên bản.
const expectToast = (page: Page, text: string | RegExp) =>
  expect(page.locator(".ant-message").getByText(text, { exact: true }).last()).toBeVisible();

const search = async (page: Page, keyword: string) => {
  const searched = page.waitForResponse(
    (response) =>
      response.url().includes(`${PV_API}/batches?`) &&
      new URL(response.url()).searchParams.get("keyword") === keyword
  );
  await page.getByPlaceholder("Tìm theo mã hoặc tên lô").fill(keyword);
  return searched;
};

const row = (page: Page, batchCode: string) =>
  page.locator("tr.ant-table-row").filter({ has: page.getByText(batchCode, { exact: true }) });

const rowAction = async (page: Page, batchCode: string, action: string) => {
  await page.getByLabel(`Thao tác lô ${batchCode}`).click();
  await page
    .locator(".ant-dropdown:not(.ant-dropdown-hidden)")
    .getByText(action, { exact: true })
    .click();
};

const confirmModal = (page: Page, title: string) =>
  page.locator(".ant-modal").filter({ hasText: title }).last();

const fillBatchForm = async (
  page: Page,
  dialog: ReturnType<Page["locator"]>,
  values: { name?: string; faceValue?: string; totalQuantity?: string; expiresAt?: string }
) => {
  if (values.name !== undefined) await dialog.getByLabel("Tên lô").fill(values.name);
  if (values.faceValue !== undefined)
    await dialog.getByLabel("Mệnh giá (VNĐ)").fill(values.faceValue);
  if (values.totalQuantity !== undefined) {
    await dialog.getByLabel("Số lượng phát hành").fill(values.totalQuantity);
  }
  if (values.expiresAt !== undefined) {
    const input = dialog.getByLabel("Ngày hết hạn");
    await input.click();
    await input.fill(values.expiresAt);
    await input.press("Enter");
  }
  await page.keyboard.press("Tab");
};

// PNG 1x1 hợp lệ (magic bytes PNG) để backend chấp nhận định dạng.
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

test.describe("Voucher giấy với API thật (pvtest local)", () => {
  let managerToken: string;
  const pageFixtures: Batch[] = [];
  let inUse: Batch;
  let profileRoot: string;
  const report: Record<string, unknown> = { runId };

  test.beforeAll(async () => {
    profileRoot = await mkdtemp(path.join(os.tmpdir(), "pv-e2e-"));
    managerToken = await apiLogin(ACCOUNTS.manager);

    // 21 lô cho phân trang (trang 20 dòng) và tìm kiếm, tạo qua API thật.
    for (let index = 1; index <= 21; index += 1) {
      const { status, body } = await apiCall<Batch>("POST", `${PV_API}/batches`, managerToken, {
        name: `${PREFIX} P${String(index).padStart(2, "0")}`,
        faceValue: 10000 + index * 1000,
        totalQuantity: 5
      });
      expect(status).toBe(201);
      pageFixtures.push(body);
    }

    // Lô "đã phát sinh lịch sử": thêm 1 dòng usage trực tiếp trên DB test (UsedCount giữ 0)
    // để kiểm tra lỗi nghiệp vụ thật PAPER_VOUCHER_BATCH_IN_USE và hiển thị lịch sử.
    const created = await apiCall<Batch>("POST", `${PV_API}/batches`, managerToken, {
      name: `${PREFIX} IN-USE`,
      faceValue: 80000,
      totalQuantity: 3
    });
    expect(created.status).toBe(201);
    inUse = created.body;
    sql(
      `INSERT INTO dbo.PaperVoucherUsage (BatchId, RequestId, Quantity, FaceValueSnapshot, AppliedAmount, Status, PosShortName, UserName)
       VALUES (${Number(inUse.id)}, N'E2E-${runId}', 1, 80000, 75000, 10, N'E2E', N'${ACCOUNTS.manager.username}')`
    );
  });

  test.afterAll(async () => {
    const reportPath = path.join(process.cwd(), "test-results", `paper-voucher-e2e-${runId}.json`);
    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, JSON.stringify(report, null, 2));
  });

  test("manager: danh sách, tìm kiếm, phân trang, sort, CRUD, lỗi thật và lưu bền", async () => {
    const session = await launch(path.join(profileRoot, "manager"));
    const { page } = session;

    try {
      await login(page, ACCOUNTS.manager);
      await openVouchers(page);

      // Summary từ API, khớp 4 thẻ.
      const summary = await apiCall<{ totalBatches: number; totalQuantity: number }>(
        "GET",
        `${PV_API}/summary`,
        managerToken
      );
      await expect(page.getByTestId("paper-voucher-stat-batches")).toContainText(
        String(summary.body.totalBatches)
      );
      report.summary = summary.body;

      // Tìm kiếm phía server.
      expect((await search(page, `${runId} P0`)).status()).toBe(200);
      await expect(page.locator("tr.ant-table-row")).toHaveCount(9);

      // Phân trang phía server: 21 kết quả, trang 2 có 1 dòng.
      await search(page, `${runId} P`);
      await expect(page.getByText("Tổng 21 bản ghi")).toBeVisible();
      await expect(page.locator("tr.ant-table-row")).toHaveCount(20);
      const page2 = page.waitForResponse(
        (response) =>
          response.url().includes(`${PV_API}/batches?`) &&
          new URL(response.url()).searchParams.get("current") === "2"
      );
      await page.locator(".ant-pagination-item-2").click();
      expect((await page2).status()).toBe(200);
      await expect(page.locator("tr.ant-table-row")).toHaveCount(1);

      // Sort phía server theo mệnh giá giảm dần: P21 (31.000đ) đứng đầu.
      const sorted = page.waitForResponse(
        (response) =>
          response.url().includes(`${PV_API}/batches?`) &&
          new URL(response.url()).searchParams.get("sort") === "faceValue.desc"
      );
      const faceValueHeader = page.locator("th").filter({ hasText: "Mệnh giá" });
      await faceValueHeader.click();
      await faceValueHeader.click();
      expect((await sorted).status()).toBe(200);
      await expect(page.locator("tr.ant-table-row").first()).toContainText(
        pageFixtures[20].batchCode
      );

      // ---------- Tạo lô qua UI ----------
      await page.getByPlaceholder("Tìm theo mã hoặc tên lô").fill("");
      await page.getByRole("button", { name: "Tạo lô Voucher" }).click();
      let dialog = confirmModal(page, "Tạo lô voucher giấy");
      await fillBatchForm(page, dialog, {
        name: `${PREFIX} UI-A`,
        faceValue: "50000",
        totalQuantity: "10",
        expiresAt: "31/12/2027"
      });
      const createdResponse = waitApi(page, "POST", /\/batches$/);
      await dialog.getByRole("button", { name: "Tạo lô" }).click();
      const created = await createdResponse;
      expect(created.status()).toBe(201);
      const batchA = (await created.json()) as Batch;
      await expectToast(page, "Đã tạo lô voucher");
      expect(dbBatch(batchA.id)).toMatchObject({
        name: `${PREFIX} UI-A`,
        faceValue: 50000,
        totalQuantity: 10,
        expiresAt: "2027-12-31",
        isLocked: false,
        deleted: false,
        createdBy: ACCOUNTS.manager.username
      });
      report.created = batchA.batchCode;

      // ---------- Sửa ----------
      await search(page, batchA.batchCode);
      await rowAction(page, batchA.batchCode, "Chỉnh sửa");
      dialog = confirmModal(page, "Chỉnh sửa lô voucher giấy");
      await fillBatchForm(page, dialog, { name: `${PREFIX} UI-A sửa`, totalQuantity: "12" });
      const updated = waitApi(page, "PATCH", /\/batches\/\d+$/);
      await dialog.getByRole("button", { name: "Lưu thay đổi" }).click();
      expect((await updated).status()).toBe(200);
      await expectToast(page, "Đã cập nhật lô voucher");
      await expect(row(page, batchA.batchCode)).toContainText(`${PREFIX} UI-A sửa`);
      expect(dbBatch(batchA.id)).toMatchObject({
        name: `${PREFIX} UI-A sửa`,
        totalQuantity: 12,
        updatedBy: ACCOUNTS.manager.username
      });

      // ---------- Khóa / mở khóa ----------
      await rowAction(page, batchA.batchCode, "Khóa lô");
      let locked = waitApi(page, "PATCH", /\/lock$/);
      await confirmModal(page, "Xác nhận khóa lô voucher")
        .getByRole("button", { name: "Khóa lô" })
        .click();
      expect((await locked).status()).toBe(200);
      await expect(row(page, batchA.batchCode)).toContainText("Đã khóa");
      expect(dbBatch(batchA.id)).toMatchObject({
        isLocked: true,
        lockedBy: ACCOUNTS.manager.username
      });

      await rowAction(page, batchA.batchCode, "Mở khóa");
      locked = waitApi(page, "PATCH", /\/lock$/);
      await confirmModal(page, "Xác nhận mở khóa lô voucher")
        .getByRole("button", { name: "Mở khóa" })
        .click();
      expect((await locked).status()).toBe(200);
      await expect(row(page, batchA.batchCode)).toContainText("Đang áp dụng");
      expect(dbBatch(batchA.id)).toMatchObject({ isLocked: false });

      // ---------- Chi tiết ----------
      const detail = waitApi(page, "GET", new RegExp(`/batches/${batchA.id}$`));
      await rowAction(page, batchA.batchCode, "Xem chi tiết");
      expect((await detail).status()).toBe(200);
      dialog = confirmModal(page, `Chi tiết lô ${batchA.batchCode}`);
      await expect(dialog.getByText("Chưa có lượt sử dụng")).toBeVisible();
      await dialog.getByRole("button", { name: "Đóng" }).click();

      // ---------- Tạo lô B rồi xóa mềm ----------
      await page.getByRole("button", { name: "Tạo lô Voucher" }).click();
      dialog = confirmModal(page, "Tạo lô voucher giấy");
      await fillBatchForm(page, dialog, {
        name: `${PREFIX} UI-B`,
        faceValue: "20000",
        totalQuantity: "2"
      });
      const createdB = waitApi(page, "POST", /\/batches$/);
      await dialog.getByRole("button", { name: "Tạo lô" }).click();
      const batchB = (await (await createdB).json()) as Batch;
      await search(page, batchB.batchCode);
      await rowAction(page, batchB.batchCode, "Xóa lô");
      const deleted = waitApi(page, "DELETE", /\/batches\/\d+$/);
      await confirmModal(page, "Xác nhận xóa lô voucher")
        .getByRole("button", { name: "Xóa" })
        .click();
      expect((await deleted).status()).toBe(204);
      await expectToast(page, "Đã xóa lô voucher");
      await expect(row(page, batchB.batchCode)).toHaveCount(0);
      expect(dbBatch(batchB.id)).toMatchObject({ deleted: true, batchCode: batchB.batchCode });

      // ---------- Lỗi nghiệp vụ thật: lô đã có lịch sử ----------
      await search(page, inUse.batchCode);
      await rowAction(page, inUse.batchCode, "Xóa lô");
      const inUseDelete = waitApi(page, "DELETE", /\/batches\/\d+$/);
      await confirmModal(page, "Xác nhận xóa lô voucher")
        .getByRole("button", { name: "Xóa" })
        .click();
      const inUseDeleteResponse = await inUseDelete;
      const inUseDeleteBody = (await inUseDeleteResponse.json()) as {
        code: string;
        message: string;
      };
      expect(inUseDeleteResponse.status()).toBe(400);
      expect(inUseDeleteBody.code).toBe("PAPER_VOUCHER_BATCH_IN_USE");
      await expectToast(page, inUseDeleteBody.message);
      await expect(row(page, inUse.batchCode)).toHaveCount(1);
      expect(dbBatch(inUse.id)).toMatchObject({ deleted: false });
      report.inUseDelete = { status: 400, ...inUseDeleteBody };

      await rowAction(page, inUse.batchCode, "Chỉnh sửa");
      dialog = confirmModal(page, "Chỉnh sửa lô voucher giấy");
      await fillBatchForm(page, dialog, { faceValue: "90000" });
      const inUseEdit = waitApi(page, "PATCH", /\/batches\/\d+$/);
      await dialog.getByRole("button", { name: "Lưu thay đổi" }).click();
      const inUseEditResponse = await inUseEdit;
      const inUseEditBody = (await inUseEditResponse.json()) as { code: string; message: string };
      expect(inUseEditResponse.status()).toBe(400);
      await expectToast(page, inUseEditBody.message);
      await expect(dialog).toBeVisible();
      expect(dbBatch(inUse.id)).toMatchObject({ faceValue: 80000 });
      report.inUseEdit = { status: 400, ...inUseEditBody };
      await dialog
        .getByRole("button", { name: "Cancel" })
        .or(dialog.getByRole("button", { name: "Hủy" }))
        .click();

      // Lịch sử sử dụng thật trong chi tiết.
      await rowAction(page, inUse.batchCode, "Xem chi tiết");
      dialog = confirmModal(page, `Chi tiết lô ${inUse.batchCode}`);
      await expect(dialog.getByText(`E2E-${runId}`)).toBeVisible();
      await expect(dialog.getByText("Đã áp dụng")).toBeVisible();
      await dialog.getByRole("button", { name: "Đóng" }).click();

      // ---------- 404: lô bị xóa ở nơi khác ----------
      const stale = pageFixtures[20];
      await search(page, stale.batchCode);
      await expect(row(page, stale.batchCode)).toHaveCount(1);
      expect((await apiCall("DELETE", `${PV_API}/batches/${stale.id}`, managerToken)).status).toBe(
        204
      );
      await rowAction(page, stale.batchCode, "Khóa lô");
      const staleLock = waitApi(page, "PATCH", /\/lock$/);
      await confirmModal(page, "Xác nhận khóa lô voucher")
        .getByRole("button", { name: "Khóa lô" })
        .click();
      const staleResponse = await staleLock;
      const staleBody = (await staleResponse.json()) as { code: string; message: string };
      expect(staleResponse.status()).toBe(404);
      await expectToast(page, staleBody.message);
      // 404 → tải lại danh sách, lô đã xóa biến mất.
      await expect(row(page, stale.batchCode)).toHaveCount(0);
      report.staleLock = { status: 404, ...staleBody };

      // ---------- Upload ảnh: chỉ upload khi lưu ----------
      await page.getByPlaceholder("Tìm theo mã hoặc tên lô").fill("");
      await page.getByRole("button", { name: "Tạo lô Voucher" }).click();
      dialog = confirmModal(page, "Tạo lô voucher giấy");
      await fillBatchForm(page, dialog, {
        name: `${PREFIX} IMG`,
        faceValue: "30000",
        totalQuantity: "1"
      });
      const beforeSave = session.responses.length;
      await dialog
        .locator(".ant-form-item")
        .filter({ hasText: "Mặt trước" })
        .locator("input[type='file']")
        .setInputFiles({ name: "mat-truoc.png", mimeType: "image/png", buffer: PNG_1X1 });
      // Chọn ảnh chưa gọi API.
      expect(session.responses.slice(beforeSave).some((r) => r.url().includes("/images"))).toBe(
        false
      );
      const upload = waitApi(page, "POST", /\/images$/);
      await dialog.getByRole("button", { name: "Tạo lô" }).click();
      const uploadResponse = await upload;
      const uploadBody = await uploadResponse.json().catch(() => null);
      report.imageUpload = { status: uploadResponse.status(), body: uploadBody };
      if (uploadResponse.status() === 201) {
        // Có Cloudinary test: lô phải được tạo với ảnh vừa upload.
        const createdImg = await waitApi(page, "POST", /\/batches$/);
        expect(createdImg.status()).toBe(201);
      } else {
        // Không có Cloudinary: phải báo lỗi và KHÔNG tạo lô.
        await expectToast(page, uploadBody?.message ?? /.+/);
        await page.waitForTimeout(1000);
        expect(
          session.responses.some(
            (r) =>
              r.request().method() === "POST" &&
              new URL(r.url()).pathname.endsWith("/batches") &&
              r.request().postData()?.includes(`${PREFIX} IMG`)
          )
        ).toBe(false);
        expect(
          sql(`SELECT COUNT(*) FROM dbo.PaperVoucherBatch WHERE Name = N'${PREFIX} IMG'`)[0][0]
        ).toBe("0");
        await dialog
          .getByRole("button", { name: "Cancel" })
          .or(dialog.getByRole("button", { name: "Hủy" }))
          .click();
      }

      // ---------- 401 → refresh token thật → gọi lại thành công ----------
      await page.evaluate(() => {
        const key = "pos-auth";
        const stored = JSON.parse(sessionStorage.getItem(key) || "null");
        stored.state.token = "expired.invalid.token";
        sessionStorage.setItem(key, JSON.stringify(stored));
      });
      const rejected = page.waitForResponse(
        (response) => response.url().startsWith(API_BASE) && response.status() === 401
      );
      const refreshed = page.waitForResponse((response) =>
        response.url().includes("/api/pos/staff/refresh-token")
      );
      const relisted = page.waitForResponse(
        (response) =>
          response.url().includes(`${PV_API}/batches?`) &&
          response.request().method() === "GET" &&
          response.status() === 200
      );
      await page.reload();
      await rejected;
      expect((await refreshed).status()).toBe(201);
      await relisted;
      await expect(page.getByText("Tổng số lô")).toBeVisible();
      report.refreshAfter401 = "ok";
    } finally {
      await quit(session);
    }

    // ---------- Lưu bền: mở lại app, đăng nhập lại, dữ liệu vẫn còn ----------
    const reopened = await launch(path.join(profileRoot, "manager-reopen"));
    try {
      await login(reopened.page, ACCOUNTS.manager);
      await openVouchers(reopened.page);
      await search(reopened.page, `${PREFIX} UI-A`);
      await expect(reopened.page.locator("tr.ant-table-row")).toHaveCount(1);
      await expect(reopened.page.locator("tr.ant-table-row")).toContainText(`${PREFIX} UI-A sửa`);
    } finally {
      await quit(reopened);
    }
  });

  test("viewer: chỉ xem, không có thao tác tạo/sửa/khóa/xóa", async () => {
    const session = await launch(path.join(profileRoot, "viewer"));
    try {
      await login(session.page, ACCOUNTS.viewer);
      await openVouchers(session.page);
      await expect(session.page.getByRole("button", { name: "Tạo lô Voucher" })).toHaveCount(0);
      await search(session.page, inUse.batchCode);
      await session.page.getByLabel(`Thao tác lô ${inUse.batchCode}`).click();
      const menu = session.page.locator(".ant-dropdown:not(.ant-dropdown-hidden)");
      await expect(menu.getByText("Xem chi tiết")).toBeVisible();
      await expect(menu.getByText("Chỉnh sửa")).toHaveCount(0);
      await expect(menu.getByText("Khóa lô")).toHaveCount(0);
      await expect(menu.getByText(/^Xóa lô/)).toHaveCount(0);
    } finally {
      await quit(session);
    }
  });

  test("không có quyền paper_vouchers: bị chặn khỏi trang Voucher", async () => {
    const session = await launch(path.join(profileRoot, "noaccess"));
    try {
      await login(session.page, ACCOUNTS.noAccess);
      await session.page.evaluate(() => {
        window.location.hash = "#/vouchers";
      });
      await expect(session.page).toHaveURL(/#\/403/, { timeout: 15000 });
      expect(session.responses.filter((r) => r.url().includes(`${PV_API}/batches`))).toHaveLength(
        0
      );
    } finally {
      await quit(session);
    }
  });
});
