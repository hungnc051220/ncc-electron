import { expect, test, type Page } from "@playwright/test";
import type { ScheduleDisplayPayload } from "../src/shared/types";

const createPayload = (count = 16): ScheduleDisplayPayload => ({
  date: "2026-09-10",
  timezone: "Asia/Ho_Chi_Minh",
  serverNow: "2026-09-10T10:00:00+07:00",
  fetchedAt: "2026-09-10T09:59:00+07:00",
  lastSuccessAt: "2026-09-10T09:59:00+07:00",
  stale: false,
  movies: Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    title:
      index % 3 === 0
        ? "Tên phim rất dài để kiểm tra hiển thị tối đa hai dòng mà không thay đổi chiều cao"
        : `Phim số ${index + 1}`,
    posterUrl: "/missing-schedule-poster.jpg",
    durationMinutes: 120,
    genre: "Tâm lý, tình cảm",
    country: "Việt Nam",
    ageRating: index % 2 ? "P" : "C16",
    version: index === 1 ? "3D" : "2D",
    language: "Phụ đề",
    free: false,
    sessions: Array.from({ length: 2 + (index % 5) }, (_, sessionIndex) => ({
      id: `${index}-${sessionIndex}`,
      time: `${String(8 + sessionIndex).padStart(2, "0")}:30`,
      startAt: `2026-09-10T${String(8 + sessionIndex).padStart(2, "0")}:30:00+07:00`
    }))
  }))
});

const openSchedule = async (page: Page, payload = createPayload()) => {
  await page.route("**/schedule/api", (route) => route.fulfill({ json: payload }));
  await page.goto("/schedule.html");
  await expect(page.locator(".movie-grid[data-active='true'] .movie-card")).toHaveCount(
    Math.min(payload.movies.length, 16)
  );
  await page.evaluate(() => document.fonts.ready);
};

const readGeometry = (page: Page) =>
  page.evaluate(() => {
    const rect = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
    const cards = [
      ...document.querySelectorAll<HTMLElement>(".movie-grid[data-active='true'] .movie-card")
    ];
    const clipped = cards.flatMap((card, index) => {
      const bounds = card.getBoundingClientRect();
      return [...card.querySelectorAll(".movie-title, .movie-details, .age-warning, .session-time")]
        .filter((item) => {
          const box = item.getBoundingClientRect();
          return box.top < bounds.top || box.bottom > bounds.bottom || box.right > bounds.right;
        })
        .map((item) => `${index}: ${item.textContent}`);
    });
    const sizes = [...document.querySelectorAll(".session-time")].map((item) => {
      const box = item.getBoundingClientRect();
      return `${Math.round(box.width)}x${Math.round(box.height)}`;
    });
    const first = cards[0].getBoundingClientRect();
    const second = cards[1].getBoundingClientRect();
    const third = cards[2].getBoundingClientRect();
    const footer = rect(".schedule-footer");
    const footerDecoration = getComputedStyle(
      document.querySelector(".schedule-footer")!,
      "::before"
    );
    const heading = rect("h1");
    return {
      clipped,
      columns: getComputedStyle(document.querySelector(".movie-grid")!).gridTemplateColumns.split(
        " "
      ).length,
      equalHeights:
        new Set(cards.map((card) => Math.round(card.getBoundingClientRect().height))).size === 1,
      equalButtons: new Set(sizes).size === 1,
      rowOrder:
        first.top === second.top &&
        second.left > first.left &&
        third.top > first.top &&
        third.left === first.left,
      headingCenter: heading.left + heading.width / 2,
      viewportCenter: innerWidth / 2,
      dateBelowHeading: rect(".schedule-date").top >= heading.bottom,
      logoLeft: rect(".brand-logo").right < heading.left,
      clockRight: rect(".schedule-clock").left > heading.right,
      posterRatio: rect(".movie-poster-shell").width / rect(".movie-poster-shell").height,
      posterFraction: rect(".movie-poster-shell").width / first.width,
      gridBottom: cards.at(-1)!.getBoundingClientRect().bottom,
      footerTop:
        footer.bottom - parseFloat(footerDecoration.bottom) - parseFloat(footerDecoration.height),
      columnGap: second.left - first.right,
      rowGap: third.top - first.bottom,
      footerBottom: footer.bottom,
      viewportHeight: innerHeight,
      documentOverflow:
        document.documentElement.scrollHeight > innerHeight ||
        document.documentElement.scrollWidth > innerWidth,
      sessionsWrap:
        [...cards[4].querySelectorAll(".session-time")].at(-1)!.getBoundingClientRect().top >
        cards[4].querySelector(".session-time")!.getBoundingClientRect().top
    };
  });

for (const viewport of [
  { width: 2160, height: 3840 },
  { width: 1080, height: 1920 },
  { width: 2160, height: 3940 }
]) {
  test(`matches the two-column composition at ${viewport.width}x${viewport.height}`, async ({
    page
  }) => {
    await page.setViewportSize(viewport);
    await openSchedule(page);
    const geometry = await readGeometry(page);
    expect(geometry).toMatchObject({
      clipped: [],
      columns: 2,
      equalHeights: true,
      equalButtons: true,
      rowOrder: true,
      dateBelowHeading: true,
      logoLeft: true,
      clockRight: true,
      documentOverflow: false,
      sessionsWrap: true
    });
    expect(geometry.headingCenter).toBeCloseTo(geometry.viewportCenter, 0);
    expect(geometry.posterRatio).toBeGreaterThan(0.65);
    expect(geometry.posterRatio).toBeLessThan(0.8);
    expect(geometry.posterFraction).toBeGreaterThan(0.26);
    expect(geometry.posterFraction).toBeLessThan(0.3);
    expect(geometry.gridBottom).toBeLessThan(geometry.footerTop);
    expect(geometry.rowGap).toBeCloseTo(geometry.columnGap, 3);
    expect(geometry.footerBottom).toBeLessThanOrEqual(viewport.height);
    await expect(page.locator(".schedule-date")).toHaveText("10/09/2026");
    await expect(page.locator(".schedule-weekday")).toHaveText("Thứ Năm");
    await expect(page.locator(".brand-logo")).toHaveAttribute("src", /logo-text-new/);
    await expect(page.locator(".movie-card").nth(1).locator(".version-badge")).toHaveText("3D");
    await expect(page.locator(".movie-card").first().locator(".age-warning")).toContainText(
      "16 tuổi trở lên (16+)"
    );
    await expect(page.locator(".movie-card").nth(1).locator(".age-warning")).toHaveCount(0);
    await expect(page.locator(".movie-poster-fallback").first()).toBeVisible();
    await page.screenshot({
      path: `e2e-artifacts/schedule-reference-${viewport.width}x${viewport.height}.png`
    });
  });
}

test("paginates an odd 17-film program and preserves equal cards with eight sessions", async ({
  page
}) => {
  await page.setViewportSize({ width: 2160, height: 3840 });
  const payload = createPayload(17);
  payload.movies[0].sessions = Array.from({ length: 8 }, (_, index) => ({
    id: `busy-${index}`,
    time: `${10 + index}:00`,
    startAt: `2026-09-10T${10 + index}:00:00+07:00`
  }));
  await openSchedule(page, payload);
  expect(await readGeometry(page)).toMatchObject({
    clipped: [],
    equalHeights: true,
    equalButtons: true,
    rowOrder: true,
    documentOverflow: false
  });
});

test("shows stale status and retains the grid on a polling error", async ({ page }) => {
  const payload = { ...createPayload(), stale: true };
  await page.clock.install();
  await openSchedule(page, payload);
  await expect(page.getByText("Dữ liệu lúc 09:59")).toBeVisible();
  await page.route("**/schedule/api", (route) =>
    route.fulfill({ status: 503, json: { message: "Mất kết nối" } })
  );
  await page.clock.fastForward(60_000);
  await expect(page.locator(".connection-banner")).toContainText("Mất kết nối");
  await expect(page.locator(".movie-grid[data-active='true'] .movie-card")).toHaveCount(16);
});

test("keeps twelve showtimes inside equal-height cards with long titles and metadata", async ({
  page
}) => {
  for (const viewport of [
    { width: 2160, height: 3840 },
    { width: 1080, height: 1920 }
  ]) {
    await page.setViewportSize(viewport);
    await page.unrouteAll({ behavior: "wait" });
    const payload = createPayload();
    payload.movies[0].free = true;
    payload.movies[0].genre = "Hành động, phiêu lưu, tâm lý, tình cảm, khoa học viễn tưởng";
    payload.movies[0].sessions = Array.from({ length: 12 }, (_, index) => ({
      id: `many-${index}`,
      time: `${10 + index}:00`,
      startAt: `2026-09-10T${10 + index}:00:00+07:00`
    }));
    await openSchedule(page, payload);
    expect(await readGeometry(page)).toMatchObject({
      clipped: [],
      equalHeights: true,
      documentOverflow: false
    });
    const card = page.locator(".movie-grid[data-active='true'] .movie-card").first();
    await expect(card.locator(".session-time")).toHaveCount(12);
    await expect(card.locator(".movie-details svg")).toHaveCount(0);
    const glyphsFit = await card.locator(".session-time").evaluateAll((times) =>
      times.every((time) => {
        const box = time.getBoundingClientRect();
        const text = time.querySelector("span")!.getBoundingClientRect();
        return text.height < box.height && text.width < box.width;
      })
    );
    expect(glyphsFit).toBe(true);
    await page.screenshot({
      path: `e2e-artifacts/schedule-many-sessions-${viewport.width}x${viewport.height}.png`
    });
  }
});

test("slides every 15 seconds, loops seamlessly, and keeps header/footer and last-page card size", async ({
  page
}) => {
  await page.setViewportSize({ width: 2160, height: 3840 });
  await page.clock.install({ time: new Date("2026-09-10T02:59:59Z") });
  await page.clock.pauseAt(new Date("2026-09-10T03:00:00Z"));
  await openSchedule(page, createPayload(33));
  const active = page.locator(".movie-grid[data-active='true']");
  const ids = () =>
    active
      .locator(".movie-card")
      .evaluateAll((cards) => cards.map((card) => Number(card.getAttribute("data-movie-id"))));
  const firstCard = await active.locator(".movie-card").first().boundingBox();
  const waitForSlide = () =>
    expect
      .poll(async () => Math.round((await active.boundingBox())!.x))
      .toBe(Math.round(firstCard!.x));
  const header = await page.locator(".schedule-header").boundingBox();
  const footer = await page.locator(".schedule-footer").boundingBox();
  expect(await ids()).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
  await page.clock.runFor(14_999);
  await expect(active).toHaveAttribute("data-page", "1");
  await page.clock.runFor(1);
  await expect(active).toHaveAttribute("data-page", "2");
  await waitForSlide();
  expect(await ids()).toEqual(Array.from({ length: 16 }, (_, i) => i + 17));
  await page.clock.runFor(15_000);
  await expect(active).toHaveAttribute("data-page", "3");
  await waitForSlide();
  expect(await ids()).toEqual([33]);
  const lastCard = await active.locator(".movie-card").boundingBox();
  expect(lastCard!.height).toBeCloseTo(firstCard!.height, 1);
  expect(lastCard!.x).toBeCloseTo(firstCard!.x, 1);
  await page.screenshot({ path: "e2e-artifacts/schedule-slide-last-2160x3840.png" });
  await page.clock.runFor(15_000);
  await expect(active).toHaveAttribute("data-page", "1");
  await waitForSlide();
  await page.clock.runFor(600);
  expect(await ids()).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
  expect(await page.locator(".schedule-header").boundingBox()).toEqual(header);
  expect(await page.locator(".schedule-footer").boundingBox()).toEqual(footer);
  await expect(page.locator(".schedule-clock")).toHaveText("10:00:45");
  const dateStyle = await page.locator(".schedule-date").evaluate((el) => ({
    color: getComputedStyle(el).color,
    size: parseFloat(getComputedStyle(el).fontSize),
    weight: getComputedStyle(el).fontWeight
  }));
  expect(dateStyle.color).toBe("rgb(255, 212, 120)");
  expect(dateStyle.size).toBeCloseTo(66.96, 1);
  expect(dateStyle.weight).toBe("850");
});
