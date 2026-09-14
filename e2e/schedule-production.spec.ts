import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { resolve } from "node:path";
import { getScheduleContentSecurityPolicy } from "../src/main/schedule-display-csp";
import postcss from "postcss";

const unsupportedTvCss = (property: string, value: string) =>
  /^(--|grid|gap$|column-gap$|row-gap$|aspect-ratio$|container|contain$|isolation$|padding-inline$|border-block)/.test(
    property
  ) ||
  /var\(|\b(?:min|max|clamp)\(|\d(?:dvh|cqh)|#[\da-f]{8}\b/i.test(value) ||
  (property === "display" && value.includes("grid"));
const stripUnsupportedTvCss = (css: string) => {
  const parsed = postcss.parse(css);
  parsed.walkRules((rule) => {
    if (rule.selector.includes(":has(")) rule.remove();
  });
  parsed.walkDecls((decl) => {
    if (unsupportedTvCss(decl.prop, decl.value)) decl.remove();
  });
  return parsed.toString();
};

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

for (const fontApi of ["missing", "ready-method", "ready-without-then", "noncallable-then"]) {
  test(`production legacy mounts with ${fontApi} font API`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript((mode) => {
      CSS.supports = () => false;
      // Some old engines expose document.fonts/ready without the modern Promise API.
      Object.defineProperty(document, "fonts", {
        configurable: true,
        value:
          mode === "missing"
            ? undefined
            : {
                ready:
                  mode === "ready-method"
                    ? function () {}
                    : mode === "noncallable-then"
                      ? { then: true }
                      : {}
              }
      });
    }, fontApi);
    await page.goto(`${baseUrl}?debug=1&force-legacy=1&rotate=90`);
    await expect(page.locator(".movie-title").first()).toHaveText("Phim kiểm tra production");
    await expect(page.locator(".schedule-header")).toBeVisible();
    await expect(page.locator(".schedule-footer")).toBeVisible();
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

for (const rotation of [0, 90, 270]) {
  test(`old TV CSS keeps 16 cards and sessions inside the screen, rotation ${rotation}`, async ({
    page
  }) => {
    await page.setViewportSize(
      rotation ? { width: 1920, height: 1080 } : { width: 1080, height: 1920 }
    );
    await page.route("**/*.css", async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, body: stripUnsupportedTvCss(await response.text()) });
    });
    await page.addInitScript(() => {
      window.CSS.supports = () => false;
      // Strip unsupported declarations from the rotated inline sheet too, before layout reads it.
      const append = Node.prototype.appendChild;
      Node.prototype.appendChild = function <T extends Node>(child: T): T {
        const result = append.call(this, child) as T;
        if (child instanceof HTMLStyleElement && child.sheet) {
          const visit = (rules: CSSRuleList) => {
            for (const rule of Array.from(rules)) {
              if ("cssRules" in rule) visit((rule as CSSMediaRule).cssRules);
              if (!("style" in rule)) continue;
              const style = (rule as CSSStyleRule).style;
              for (const prop of Array.from(style)) {
                const value = style.getPropertyValue(prop);
                if (
                  /^(--|grid|gap$|column-gap$|row-gap$|aspect-ratio$|container|contain$|isolation$|padding-inline$|border-block)/.test(
                    prop
                  ) ||
                  /var\(|\b(?:min|max|clamp)\(|\d(?:dvh|cqh)|#[\da-f]{8}\b/i.test(value) ||
                  (prop === "display" && value.includes("grid"))
                )
                  style.removeProperty(prop);
              }
            }
          };
          visit(child.sheet.cssRules);
        }
        return result;
      };
    });
    await page.route("**/schedule/api*", (route) =>
      route.fulfill({
        json: {
          serverNow: "2026-09-10T10:00:00+07:00",
          stale: false,
          movies: Array.from({ length: 33 }, (_, index) => ({
            id: index + 1,
            title: `Phim số ${index + 1} có tên dài kiểm tra bố cục trên Android Box`,
            posterUrl: "",
            durationMinutes: 120,
            ageRating: "C16",
            version: "2D",
            genre: "Tâm lý",
            country: "Việt Nam",
            free: false,
            sessions: Array.from({ length: 12 }, (_, session) => ({
              id: session,
              time: "10:30",
              startAt: "2026-09-10T10:30:00+07:00"
            }))
          }))
        }
      })
    );
    await page.clock.install();
    await page.goto(`${baseUrl}?force-legacy=1&rotate=${rotation}`);
    const active = page.locator(".movie-grid[data-active='true']");
    await expect(active.locator(".movie-card")).toHaveCount(16);
    await page.evaluate(() => document.fonts.ready);
    const geometry = await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>(".schedule-screen")!;
      const cards = Array.from(
        root.querySelectorAll<HTMLElement>(".movie-grid[data-active='true'] .movie-card")
      );
      const clipped: string[] = [];
      for (const card of cards) {
        const bounds = card.getBoundingClientRect();
        for (const child of card.querySelectorAll(
          ".movie-poster-shell, .movie-title, .movie-details, .age-warning, .session-time"
        )) {
          const box = child.getBoundingClientRect();
          if (
            box.top < bounds.top - 1 ||
            box.bottom > bounds.bottom + 1 ||
            box.left < bounds.left - 1 ||
            box.right > bounds.right + 1 ||
            box.width < 1 ||
            box.height < 1
          )
            clipped.push(child.className);
        }
      }
      return {
        legacy: root.classList.contains("schedule-legacy"),
        layout: root.getAttribute("data-viewport"),
        clipped,
        sizes: cards.map((card) => [card.offsetWidth, card.offsetHeight]),
        rowGap: cards[2].offsetTop - cards[0].offsetTop - cards[0].offsetHeight,
        columnGap: cards[1].offsetLeft - cards[0].offsetLeft - cards[0].offsetWidth,
        rootBox: {
          width: root.getBoundingClientRect().width,
          height: root.getBoundingClientRect().height
        },
        overflow:
          document.documentElement.scrollWidth > innerWidth ||
          document.documentElement.scrollHeight > innerHeight
      };
    });
    expect(geometry.legacy).toBe(true);
    expect(geometry.layout).toBe("1080x1920");
    expect(geometry.clipped).toEqual([]);
    expect(geometry.overflow).toBe(false);
    expect(Math.abs(geometry.columnGap - geometry.rowGap)).toBeLessThanOrEqual(1);
    expect(new Set(geometry.sizes.map((size) => size.join("x"))).size).toBe(1);
    expect(geometry.rootBox).toEqual(
      rotation ? { width: 1920, height: 1080 } : { width: 1080, height: 1920 }
    );
    await page.screenshot({ path: `e2e-artifacts/schedule-old-tv-rotate-${rotation}.png` });
    await page.clock.runFor(15_000);
    await expect(active).toHaveAttribute("data-page", "2");
    await expect(active.locator(".movie-card").first()).toHaveAttribute("data-movie-id", "17");
    await page.clock.runFor(15_000);
    await expect(active.locator(".movie-card")).toHaveCount(1);
    const lastSize = await active
      .locator(".movie-card")
      .evaluate((card: HTMLElement) => [card.offsetWidth, card.offsetHeight]);
    expect(lastSize).toEqual(geometry.sizes[0]);
  });
}
