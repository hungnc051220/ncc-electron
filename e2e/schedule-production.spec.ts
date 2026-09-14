import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { resolve } from "node:path";
import { getScheduleContentSecurityPolicy } from "../src/main/schedule-display-csp";

// Build first: npm run build. These checks serve emitted files, not Vite's dev transforms.
let server: Server;
let baseUrl: string;
test.beforeAll(async () => {
  const root = resolve("out/schedule");
  const productionHtml = readFileSync(resolve(root, "schedule.html"), "utf8");
  server = createServer((request, response) => {
    const url = new URL(request.url!, "http://localhost");
    if (url.pathname === "/schedule" || url.pathname === "/schedule/") {
      // Exercise the real SystemJS/nomodule output in modern test Chromium.
      // This only changes the test response, never the production HTML on disk.
      const html = url.searchParams.has("force-legacy")
        ? productionHtml
            .replace(/<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/g, "")
            .replace(/\snomodule\b/g, "")
        : productionHtml;
      response.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": getScheduleContentSecurityPolicy(
          url.searchParams.has("csp1") ? "" : productionHtml
        )
      });
      response.end(html);
    } else if (/^\/schedule\/assets\/[\w.-]+$/.test(url.pathname)) {
      try {
        const file = readFileSync(resolve(root, url.pathname.slice("/schedule/".length)));
        const type = url.pathname.endsWith(".js")
          ? "text/javascript"
          : url.pathname.endsWith(".css")
            ? "text/css"
            : url.pathname.endsWith(".svg")
              ? "image/svg+xml"
              : "application/octet-stream";
        response.writeHead(200, { "Content-Type": type });
        response.end(file);
      } catch {
        response.writeHead(404).end();
      }
    } else {
      response.writeHead(404).end();
    }
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing test server port");
  baseUrl = `http://127.0.0.1:${address.port}/schedule`;
});
test.afterAll(async () => {
  await new Promise<void>((done, reject) =>
    server.close((error) => (error ? reject(error) : done()))
  );
});

test.beforeEach(async ({ page }) => {
  await page.route("**/schedule/api*", (route) =>
    route.fulfill({
      json: {
        date: "2026-09-10",
        timezone: "Asia/Ho_Chi_Minh",
        serverNow: "2026-09-10T10:00:00+07:00",
        fetchedAt: "2026-09-10T10:00:00+07:00",
        lastSuccessAt: "2026-09-10T10:00:00+07:00",
        stale: false,
        movies: [
          {
            id: 1,
            title: "Phim kiểm tra production",
            posterUrl: "",
            durationMinutes: 120,
            version: "2D",
            language: "PDV",
            ageRating: "P",
            free: false,
            sessions: [{ id: 1, time: "10:30", startAt: "2026-09-10T10:30:00+07:00" }]
          }
        ]
      }
    })
  );
});

for (const mode of ["modern", "legacy", "legacy-csp1"]) {
  const legacy = mode !== "modern";
  test(`production ${mode} mounts under CSP`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    if (legacy)
      await page.addInitScript(() => {
        for (const key of ["fetch", "Intl"]) {
          Object.defineProperty(window, key, {
            configurable: true,
            writable: true,
            value: undefined
          });
        }
      });
    await page.goto(
      `${baseUrl}?debug=1${legacy ? "&force-legacy=1" : ""}${mode === "legacy-csp1" ? "&csp1=1" : ""}`
    );
    await expect(page.locator(".movie-title").first()).toHaveText("Phim kiểm tra production");
    await expect(page.locator(".schedule-date")).toHaveText("10/09/2026");
    await expect(page.locator(".schedule-weekday")).toHaveText("Thứ Năm");
    await expect(page.locator("#schedule-debug-badge")).toContainText("JS BASIC OK");
    await expect(page.locator("#schedule-debug-badge")).toContainText(
      `${legacy ? "LEGACY" : "MODERN"} BUNDLE OK`
    );
    await expect(page.locator("#schedule-debug-badge")).toContainText("REACT MOUNT OK");
    await expect(page.locator("#schedule-debug-error")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test("API failure preserves static UI and diagnostics stay off by default", async ({ page }) => {
  await page.route("**/schedule/api*", (route) =>
    route.fulfill({ status: 503, json: { message: "API offline" } })
  );
  await page.goto(baseUrl);
  await expect(page.getByRole("heading", { name: "Không thể tải lịch chiếu" })).toBeVisible();
  await expect(page.locator(".schedule-header")).toBeVisible();
  await expect(page.locator(".brand-logo")).toBeVisible();
  await expect(page.locator(".schedule-footer")).toBeVisible();
  await expect(page.locator("#schedule-debug-badge")).toHaveCount(0);
});

test("debug reports script failures before React mounts", async ({ page }) => {
  await page.route("**/assets/schedule-*.js", (route) => route.abort());
  await page.goto(`${baseUrl}?debug=1`);
  const overlay = page.locator("#schedule-debug-error");
  await expect(overlay).toContainText("ERROR TYPE: SCRIPT LOAD");
  await expect(overlay).toContainText("JS BASIC OK");
  for (const field of ["message:", "source:", "line:", "column:"])
    await expect(overlay).toContainText(field);
  await expect(page.locator("#root")).toBeEmpty();
});

test("debug displays JavaScript, unhandled rejection and React errors", async ({ page }) => {
  await page.goto(`${baseUrl}?debug=1`);
  await expect(page.locator("#schedule-debug-badge")).toContainText("REACT MOUNT OK");
  await page.evaluate(() => {
    setTimeout(() => {
      throw new Error("TV runtime failure");
    }, 0);
  });
  await expect(page.locator("#schedule-debug-error")).toContainText("TV runtime failure");
  await page.evaluate(() => {
    void Promise.reject(new Error("TV rejection failure"));
  });
  await expect(page.locator("#schedule-debug-error")).toContainText(
    "ERROR TYPE: UNHANDLED REJECTION"
  );

  // Invalid movie data triggers a real render error, exercising createRoot's handler.
  await page.route("**/schedule/api*", (route) =>
    route.fulfill({
      json: {
        movies: [null],
        serverNow: "2026-09-10T10:00:00+07:00"
      }
    })
  );
  await page.reload();
  await expect(page.locator("#schedule-debug-error")).toContainText("ERROR TYPE: REACT");
});
