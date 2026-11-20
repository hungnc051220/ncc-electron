/**
 * E2E cấu hình icon ghế: Electron thật → NestJS local (`scripts/dev/run-local.js`, nhánh feature/seat-icon-config)
 * → `CinemaTicketDev`. Chụp màn hình giao diện thật ở 1024×768 và 1920×1080 (sáng/tối).
 *
 * Opt-in, chỉ chạy với backend loopback. Cần `npm run build` trước (Electron chạy bản `out/`).
 * Env:
 *   E2E_SEAT_ICON_API_BASE      http://127.0.0.1:<port>
 *   E2E_SEAT_ICON_USERNAME / E2E_SEAT_ICON_PASSWORD   tài khoản có quyền seat_icon_configs (access/list/view/create/
 *                               update/delete) và quyền mở sơ đồ bán vé.
 *   E2E_SEAT_ICON_SCREENING_ID  suất chiếu có sẵn ghế đã bán (chỉ đọc: không chọn ghế, không bán/hủy vé).
 *   E2E_SEAT_ICON_WRITE=1       (tùy chọn) tạo một cấu hình phạm vi PHIM của suất trên, chụp sơ đồ có icon rồi xóa.
 *                               Ảnh upload thật lên Cloudinary (backend chạy `--allow-cloudinary`).
 *
 * Ảnh lưu ở `test-results/seat-icon-config/` (git-ignore).
 */
import {
  _electron as electron,
  expect,
  test,
  type ElectronApplication,
  type Page
} from "@playwright/test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";

const API_BASE = process.env.E2E_SEAT_ICON_API_BASE || "";
const ACCOUNT = {
  username: process.env.E2E_SEAT_ICON_USERNAME,
  password: process.env.E2E_SEAT_ICON_PASSWORD
};
const SCREENING_ID = Number(process.env.E2E_SEAT_ICON_SCREENING_ID || 0);
const ALLOW_WRITE = process.env.E2E_SEAT_ICON_WRITE === "1";
const OUT_DIR = path.join("test-results", "seat-icon-config");
const SIZES = [
  { name: "1024x768", width: 1024, height: 768 },
  { name: "1920x1080", width: 1920, height: 1080 }
];

const isConfigured =
  /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(API_BASE) &&
  Boolean(ACCOUNT.username && ACCOUNT.password);

test.skip(!isConfigured, "Chỉ chạy khi cấu hình backend local (E2E_SEAT_ICON_*)");
test.describe.configure({ mode: "serial" });

type Session = { app: ElectronApplication; page: Page };

const launch = async (theme: "light" | "dark"): Promise<Session> => {
  const profileDir = await mkdtemp(path.join(os.tmpdir(), "ncc-seat-icon-e2e-"));
  // Profile riêng: config.json trỏ backend local, không đụng cấu hình máy thật.
  await writeFile(
    path.join(profileDir, "config.json"),
    JSON.stringify({
      apiBaseUrl: API_BASE,
      socketUrl: API_BASE.replace(/^http/, "ws"),
      theme
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
  return { app, page };
};

const quit = (session: Session) =>
  session.app.evaluate(({ app }) => app.exit(0)).catch(() => undefined);

/** Cửa sổ chính mở ở chế độ kiosk; thoát kiosk là bất đồng bộ nên đặt lại kích thước tới khi khớp. */
const resize = async (session: Session, width: number, height: number) => {
  for (let attempt = 0; attempt < 20; attempt++) {
    const bounds = await session.app.evaluate(
      ({ BrowserWindow }, size) => {
        // Trang bán vé mở thêm cửa sổ màn hình khách hàng (`?view=customer`): chỉ đổi cửa sổ chính.
        const window = BrowserWindow.getAllWindows().find(
          (item) => !item.webContents.getURL().includes("view=customer")
        )!;
        if (window.isKiosk()) window.setKiosk(false);
        if (window.isFullScreen()) window.setFullScreen(false);
        if (window.isMaximized()) window.unmaximize();
        window.setContentBounds({ x: 0, y: 0, width: size.width, height: size.height });
        return window.getContentBounds();
      },
      { width, height }
    );
    await session.page.waitForTimeout(300);
    const viewport = await session.page.evaluate(() => [window.innerWidth, window.innerHeight]);
    if (bounds.width === width && bounds.height === height && viewport[0] === width) return;
  }
  throw new Error(`Không đổi được cửa sổ về ${width}×${height}`);
};

const shot = async (page: Page, name: string) => {
  await mkdir(OUT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`) });
};

const login = async (page: Page) => {
  await expect(page.getByRole("heading", { name: "Chào mừng trở lại" })).toBeVisible({
    timeout: 60000
  });
  await page.getByLabel("Tên đăng nhập").fill(ACCOUNT.username!);
  await page.getByLabel("Mật khẩu").fill(ACCOUNT.password!);
  // Route quản trị được guard theo quyền: chờ quyền nhân viên nạp xong rồi mới chuyển trang.
  const permissionsLoaded = page.waitForResponse(
    (response) => response.url().includes("/api/pos/permissions/staff") && response.ok(),
    { timeout: 60000 }
  );
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).not.toHaveURL(/#\/login/, { timeout: 30000 });
  await permissionsLoaded;
  await page.waitForTimeout(500);
};

const openConfigs = async (page: Page) => {
  const listed = page.waitForResponse(
    (response) =>
      response.url().includes("/api/pos/seat-icon-configs?") &&
      response.request().method() === "GET"
  );
  await page.evaluate(() => {
    window.location.hash = "#/seat-icon-configs";
  });
  expect((await listed).status()).toBe(200);
  await expect(
    page.getByText("Ảnh thay cho ô ghế đã bán trên sơ đồ bán vé.", { exact: false })
  ).toBeVisible();
};

/** PNG 64×64 một màu (vẽ bằng zlib, không cần thư viện ảnh) để upload thử. */
const createPng = (rgb: [number, number, number]) => {
  const size = 64;
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buffer: Buffer) => {
    let c = 0xffffffff;
    for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const typed = Buffer.concat([Buffer.from(type), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const checksum = Buffer.alloc(4);
    checksum.writeUInt32BE(crc(typed));
    return Buffer.concat([length, typed, checksum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.writeUInt8(8, 8); // bit depth
  header.writeUInt8(2, 9); // RGB
  const rows = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const offset = y * (size * 3 + 1) + 1 + x * 3;
      const isRing = Math.hypot(x - 31.5, y - 31.5) < 22;
      rows[offset] = isRing ? 255 : rgb[0];
      rows[offset + 1] = isRing ? 255 : rgb[1];
      rows[offset + 2] = isRing ? 255 : rgb[2];
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0))
  ]);
};

test("list page and add/edit modal (light + dark, 1024×768 + 1920×1080)", async () => {
  test.setTimeout(240_000);
  for (const theme of ["light", "dark"] as const) {
    const session = await launch(theme);
    try {
      await login(session.page);
      await openConfigs(session.page);
      for (const size of SIZES) {
        await resize(session, size.width, size.height);
        await shot(session.page, `01-list-${theme}-${size.name}`);
      }

      await session.page.getByRole("button", { name: "Thêm cấu hình" }).click();
      const dialog = session.page
        .locator(".ant-modal")
        .filter({ hasText: "Thêm cấu hình icon ghế" });
      await expect(dialog).toBeVisible();
      for (const size of SIZES) {
        await resize(session, size.width, size.height);
        await shot(session.page, `02-create-${theme}-${size.name}`);
      }
      await dialog.getByRole("button", { name: "Hủy" }).click();

      const firstAction = session.page.getByLabel(/^Thao tác cấu hình #\d+$/).first();
      if (await firstAction.isVisible().catch(() => false)) {
        await firstAction.click();
        await session.page.getByRole("menuitem", { name: "Cập nhật" }).click();
        await expect(session.page.getByText(/Sửa cấu hình icon ghế #\d+/)).toBeVisible();
        for (const size of SIZES) {
          await resize(session, size.width, size.height);
          await shot(session.page, `03-edit-${theme}-${size.name}`);
        }
      }
    } finally {
      await quit(session);
    }
  }
});

test("seat map of a real screening uses the effective icon (read-only)", async () => {
  test.skip(!SCREENING_ID, "Cần E2E_SEAT_ICON_SCREENING_ID");
  test.setTimeout(300_000);

  let token = "";
  let createdId: number | null = null;
  const apiCall = async <T>(method: string, url: string, body?: BodyInit, json?: unknown) => {
    const response = await fetch(`${API_BASE}${url}`, {
      method,
      headers: {
        ...(json === undefined ? {} : { "content-type": "application/json" }),
        authorization: `Bearer ${token}`
      },
      body: json === undefined ? body : JSON.stringify(json)
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`${method} ${url} → ${response.status} ${text}`);
    return (text ? JSON.parse(text) : undefined) as T;
  };

  const loginResponse = await fetch(`${API_BASE}/api/pos/staff/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: ACCOUNT.username, password: ACCOUNT.password })
  });
  token = ((await loginResponse.json()) as { access_token: string }).access_token;
  const screening = await apiCall<{ filmId: number; roomId: number }>(
    "GET",
    `/api/pos/plan-screenings/${SCREENING_ID}`
  );

  if (ALLOW_WRITE) {
    const existing = await apiCall<{ data: { id: number; scope: string; scopeId: number }[] }>(
      "GET",
      "/api/pos/seat-icon-configs?pageSize=0"
    );
    const owned = existing.data.find(
      (item) => item.scope === "FILM" && item.scopeId === screening.filmId
    );
    if (!owned) {
      const form = new FormData();
      form.append(
        "file",
        new Blob([createPng([70, 79, 180])], { type: "image/png" }),
        "e2e-seat-icon.png"
      );
      const uploaded = await apiCall<{ url: string }>(
        "POST",
        "/api/pos/seat-icon-configs/images",
        form
      );
      const created = await apiCall<{ id: number }>(
        "POST",
        "/api/pos/seat-icon-configs",
        undefined,
        {
          targetType: "SOLD",
          scope: "FILM",
          scopeId: screening.filmId,
          imageUrl: uploaded.url,
          isEnabled: true
        }
      );
      createdId = created.id;
    }
  }

  try {
    for (const theme of ["light", "dark"] as const) {
      const session = await launch(theme);
      try {
        await login(session.page);
        const effective = session.page.waitForResponse((response) =>
          response.url().includes("/api/pos/seat-icon-configs/effective?")
        );
        await session.page.evaluate((id) => {
          window.location.hash = `#/plan-screening/${id}`;
        }, SCREENING_ID);
        const effectiveResponse = await effective;
        expect(effectiveResponse.status()).toBe(200);
        expect(effectiveResponse.url()).toContain(`filmId=${screening.filmId}`);
        expect(effectiveResponse.url()).toContain(`roomId=${screening.roomId}`);
        const body = (await effectiveResponse.json()) as {
          hasIcon: boolean;
          imageUrl: string | null;
        };
        await expect(session.page.locator("[data-seat-code]").first()).toBeVisible({
          timeout: 30000
        });
        if (body.hasIcon) {
          await expect(session.page.locator("[data-seat-code] img").first()).toBeVisible({
            timeout: 30000
          });
        }
        for (const size of SIZES) {
          await resize(session, size.width, size.height);
          await shot(
            session.page,
            `04-seatmap-${body.hasIcon ? "icon" : "default"}-${theme}-${size.name}`
          );
        }
      } finally {
        await quit(session);
      }
    }
  } finally {
    if (createdId) await apiCall("DELETE", `/api/pos/seat-icon-configs/${createdId}`);
  }
});
