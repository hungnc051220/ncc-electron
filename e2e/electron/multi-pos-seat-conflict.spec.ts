/* eslint-disable no-empty-pattern */
import {
  _electron as electron,
  expect,
  test,
  type ElectronApplication,
  type Page
} from "@playwright/test";
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type PosSession = {
  app: ElectronApplication;
  page: Page;
  posName: string;
  events: string[];
};

const username = process.env.E2E_POS_USERNAME;
const password = process.env.E2E_POS_PASSWORD;
const phase1HoldMs = Number(process.env.E2E_PHASE1_HOLD_MS || "60000");
const requestedShowtimeDate = process.env.E2E_SHOWTIME_DATE;
const requestedShowtimeLabel = process.env.E2E_SHOWTIME_LABEL;

const timestamp = () => new Date().toISOString();

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatApiDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${day}-${month}-${year}`;
};

const normalizeApiDate = (value: string) => {
  const [day, month, year] = value.split("-");
  return `${year}-${month}-${day}`;
};

const redactSensitiveUrl = (value: string) => {
  try {
    const url = new URL(value);
    ["token", "access_token", "refresh_token"].forEach((parameter) => {
      if (url.searchParams.has(parameter)) {
        url.searchParams.set(parameter, "[REDACTED]");
      }
    });
    return url.toString();
  } catch {
    return value;
  }
};

const attachDiagnostics = (page: Page, posName: string, events: string[]) => {
  const record = (message: string) => events.push(`${timestamp()} ${posName} ${message}`);

  page.on("console", (message) => record(`console:${message.type()} ${message.text()}`));
  page.on("request", (request) => {
    if (/selecting-chairs|orders|reservation|plan-screenings/i.test(request.url())) {
      record(`request ${request.method()} ${redactSensitiveUrl(request.url())}`);
    }
  });
  page.on("response", (response) => {
    if (/selecting-chairs|orders|reservation|plan-screenings/i.test(response.url())) {
      record(
        `response ${response.status()} ${response.request().method()} ${redactSensitiveUrl(response.url())}`
      );
    }
  });
  page.on("websocket", (socket) => {
    record(`websocket opened ${redactSensitiveUrl(socket.url())}`);
    socket.on("framereceived", (event) => {
      const payload = String(event.payload);
      if (/selecting|chair|seat/i.test(payload)) {
        record(`websocket received ${payload.slice(0, 2000)}`);
      }
    });
    socket.on("framesent", (event) => {
      const payload = String(event.payload);
      if (/selecting|chair|seat/i.test(payload)) {
        record(`websocket sent ${payload.slice(0, 2000)}`);
      }
    });
  });
};

const arrangeWindow = async (app: ElectronApplication, side: "left" | "right") => {
  await app.evaluate(({ BrowserWindow, screen }, selectedSide) => {
    const window = BrowserWindow.getAllWindows()[0];
    const workArea = screen.getPrimaryDisplay().workArea;
    const width = Math.floor(workArea.width / 2);

    window.setKiosk(false);
    window.setFullScreen(false);
    window.setAlwaysOnTop(false);
    window.setBounds({
      x: selectedSide === "left" ? workArea.x : workArea.x + width,
      y: workArea.y,
      width,
      height: workArea.height
    });
    window.show();
  }, side);
};

const addPosBadge = async (page: Page, posName: string) => {
  await page.evaluate((name) => {
    document.querySelector("[data-e2e-pos-badge]")?.remove();
    const badge = document.createElement("div");
    badge.dataset.e2ePosBadge = "true";
    badge.textContent = name;
    Object.assign(badge.style, {
      position: "fixed",
      top: "8px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: "999999",
      padding: "6px 18px",
      borderRadius: "999px",
      background: name === "POS-A" ? "#0369a1" : "#9f1239",
      color: "white",
      font: "700 16px sans-serif",
      boxShadow: "0 4px 14px rgba(0,0,0,.35)",
      pointerEvents: "none"
    });
    document.body.appendChild(badge);
  }, posName);
};

const launchPos = async (
  posName: string,
  posShortName: string,
  profilePath: string,
  videoPath: string,
  side: "left" | "right"
): Promise<PosSession> => {
  const events: string[] = [];
  const electronEnv = { ...process.env };
  delete electronEnv.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({
    args: [`--user-data-dir=${profilePath}`, "."],
    cwd: process.cwd(),
    env: electronEnv,
    recordVideo: {
      dir: videoPath,
      size: { width: 960, height: 900 }
    },
    slowMo: 100
  });
  const page = await app.firstWindow();

  attachDiagnostics(page, posName, events);
  await arrangeWindow(app, side);

  await page.evaluate(
    ({ name, shortName }) => {
      localStorage.setItem(
        "pos-settings",
        JSON.stringify({ state: { posName: name, posShortName: shortName }, version: 0 })
      );
    },
    { name: posName, shortName: posShortName }
  );
  await page.reload();
  await addPosBadge(page, posName);

  return { app, page, posName, events };
};

const loginThroughUi = async (session: PosSession) => {
  await expect(session.page.getByRole("heading", { name: "Chào mừng trở lại" })).toBeVisible();
  await session.page.getByLabel("Tên đăng nhập").fill(username!);
  await session.page.getByLabel("Mật khẩu").fill(password!);
  await session.page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(session.page).not.toHaveURL(/#\/login/, { timeout: 30000 });
  await addPosBadge(session.page, session.posName);
};

const openShowtimesDate = async (session: PosSession, date: string) => {
  await session.page.evaluate(() => {
    window.location.hash = "#/showtimes";
  });
  await expect(
    session.page.getByRole("heading", { name: "Danh sách phim đang chiếu" })
  ).toBeVisible({ timeout: 30000 });

  await session.page.locator(".ant-picker").click();
  const [targetYear, targetMonth] = date.split("-").map(Number);
  const currentDate = new Date();
  const monthOffset =
    (targetYear - currentDate.getFullYear()) * 12 + targetMonth - (currentDate.getMonth() + 1);
  const monthNavigationButton =
    monthOffset > 0 ? ".ant-picker-header-next-btn" : ".ant-picker-header-prev-btn";

  for (let offset = 0; offset < Math.abs(monthOffset); offset += 1) {
    await session.page.locator(`.ant-picker-dropdown ${monthNavigationButton}`).click();
  }

  const targetDate = session.page.locator(`.ant-picker-dropdown .ant-picker-cell[title="${date}"]`);
  await expect(targetDate).toBeVisible({ timeout: 15000 });
  const dateResponse = session.page.waitForResponse(
    (response) =>
      response.url().includes(`/api/pos/plan-screenings/get-by-date?date=${date}`) &&
      response.status() === 200,
    { timeout: 30000 }
  );
  await targetDate.click();
  await dateResponse;

  if (date < formatDate(new Date())) {
    const showPastCheckbox = session.page.getByRole("checkbox", {
      name: "Hiển thị lịch đã chiếu"
    });
    if (!(await showPastCheckbox.isChecked())) {
      await showPastCheckbox.check();
    }
  }
  await addPosBadge(session.page, session.posName);
};

const showtimeButtons = (page: Page) =>
  page.locator(".ant-table button").filter({ hasText: /^\d{2}:\d{2}$/ });

const getAvailableDates = async (page: Page) => {
  const from = new Date();
  const to = new Date();
  from.setFullYear(from.getFullYear() - 1);
  to.setFullYear(to.getFullYear() + 1);

  return page.evaluate(
    async ({ fromDate, toDate }) => {
      const appWindow = window as unknown as {
        api: { getConfig: () => Promise<{ apiBaseUrl: string }> };
      };
      const config = await appWindow.api.getConfig();
      const auth = JSON.parse(sessionStorage.getItem("pos-auth") || "null") as {
        state?: { token?: string };
      } | null;
      const response = await fetch(
        `${config.apiBaseUrl}/api/pos/plan-screenings/available-dates?fromDate=${fromDate}&toDate=${toDate}`,
        { headers: { Authorization: `Bearer ${auth?.state?.token || ""}` } }
      );

      if (!response.ok) {
        throw new Error(`Available dates request failed: ${response.status}`);
      }

      const payload = (await response.json()) as string[] | { data?: string[] };
      return Array.isArray(payload) ? payload : payload.data || [];
    },
    { fromDate: formatApiDate(from), toDate: formatApiDate(to) }
  );
};

test("phase 1 - open two real POS instances on the same showtime", async ({}, testInfo) => {
  test.skip(!username || !password, "E2E_POS_USERNAME and E2E_POS_PASSWORD are required");

  const artifactRoot = testInfo.outputPath("multi-pos-artifacts");
  const profileRoot = path.join(artifactRoot, "profiles");
  const videoRoot = path.join(artifactRoot, "videos");
  await mkdir(profileRoot, { recursive: true });
  await mkdir(videoRoot, { recursive: true });

  const sessions: PosSession[] = [];

  try {
    const [posA, posB] = await Promise.all([
      launchPos(
        "POS-A",
        "PA",
        path.join(profileRoot, "pos-a"),
        path.join(videoRoot, "pos-a"),
        "left"
      ),
      launchPos(
        "POS-B",
        "PB",
        path.join(profileRoot, "pos-b"),
        path.join(videoRoot, "pos-b"),
        "right"
      )
    ]);
    sessions.push(posA, posB);

    await Promise.all([loginThroughUi(posA), loginThroughUi(posB)]);

    let selectedDate: string | undefined;
    let showtimeIndex = -1;
    if (requestedShowtimeDate && requestedShowtimeLabel) {
      await openShowtimesDate(posA, requestedShowtimeDate);
      const requestedButton = posA.page.getByRole("button", {
        name: requestedShowtimeLabel,
        exact: true
      });
      await expect(requestedButton.first()).toBeVisible({ timeout: 30000 });
      const labels = (await showtimeButtons(posA.page).allTextContents()).map((label) =>
        label.trim()
      );
      showtimeIndex = labels.indexOf(requestedShowtimeLabel);
      selectedDate = requestedShowtimeDate;
    } else {
      const today = formatDate(new Date());
      const availableDates = (await getAvailableDates(posA.page)).map(normalizeApiDate);
      const candidateDates = [
        ...availableDates.filter((date) => date >= today).sort(),
        ...availableDates
          .filter((date) => date < today)
          .sort()
          .reverse()
      ];
      posA.events.push(`${timestamp()} AVAILABLE_DATES ${candidateDates.join(",")}`);

      for (const date of candidateDates) {
        await openShowtimesDate(posA, date);
        await posA.page.waitForTimeout(800);

        if ((await showtimeButtons(posA.page).count()) > 0) {
          selectedDate = date;
          showtimeIndex = 0;
          break;
        }
      }
    }

    expect(selectedDate, "No usable showtime was found in the available-dates API").toBeTruthy();
    posA.events.push(`${timestamp()} SELECTED_DATE ${selectedDate}`);
    await openShowtimesDate(posB, selectedDate!);
    await posB.page.waitForTimeout(1200);

    if ((await showtimeButtons(posB.page).count()) === 0) {
      posB.events.push(`${timestamp()} SHOWTIMES_EMPTY_RELOADING url=${posB.page.url()}`);
      await posB.page.reload();
      await expect(
        posB.page.getByRole("heading", { name: "Danh sách phim đang chiếu" })
      ).toBeVisible({ timeout: 30000 });
      await posB.page.waitForTimeout(1500);
      await addPosBadge(posB.page, posB.posName);
    }

    const posATimes = showtimeButtons(posA.page);
    const posBTimes = showtimeButtons(posB.page);
    await expect(posBTimes.nth(showtimeIndex)).toBeVisible();
    const showtimeLabel = (await posATimes.nth(showtimeIndex).textContent())?.trim();

    await Promise.all([posATimes.nth(showtimeIndex).click(), posBTimes.nth(showtimeIndex).click()]);
    await Promise.all([
      posA.page.waitForURL(/#\/plan-screening\/\d+/),
      posB.page.waitForURL(/#\/plan-screening\/\d+/)
    ]);

    const planScreeningA = posA.page.url().match(/plan-screening\/(\d+)/)?.[1];
    const planScreeningB = posB.page.url().match(/plan-screening\/(\d+)/)?.[1];
    expect(planScreeningA).toBe(planScreeningB);

    await Promise.all([
      posA.page.locator("[data-seat-code]").first().waitFor({ state: "visible", timeout: 30000 }),
      posB.page.locator("[data-seat-code]").first().waitFor({ state: "visible", timeout: 30000 })
    ]);
    await Promise.all([addPosBadge(posA.page, posA.posName), addPosBadge(posB.page, posB.posName)]);

    posA.events.push(
      `${timestamp()} PHASE1_READY date=${selectedDate} showtime=${showtimeLabel} planScreeningId=${planScreeningA}`
    );
    posB.events.push(
      `${timestamp()} PHASE1_READY date=${selectedDate} showtime=${showtimeLabel} planScreeningId=${planScreeningB}`
    );

    await Promise.all([
      posA.page.screenshot({ path: path.join(artifactRoot, "phase1-pos-a.png") }),
      posB.page.screenshot({ path: path.join(artifactRoot, "phase1-pos-b.png") })
    ]);

    await posA.page.waitForTimeout(phase1HoldMs);
  } finally {
    for (const session of sessions) {
      await writeFile(
        path.join(artifactRoot, `${session.posName.toLowerCase()}-timeline.log`),
        `${session.events.join("\n")}\n`,
        "utf8"
      );
      await session.app.evaluate(({ app }) => app.exit(0)).catch(() => undefined);
    }
  }
});

type SelectingSnapshot = {
  planScreenId: number;
  posName: string;
  selectingChairIndexF1?: string;
  selectingChairIndexF2?: string;
  selectingChairIndexF3?: string;
};

type UiSeatState = {
  selected: boolean;
  pending: boolean;
  conflicted: boolean;
  selectingByOther: boolean;
  className: string;
};

const getSelectingSnapshots = async (page: Page, planScreenId: number) =>
  page.evaluate(async (screeningId) => {
    const appWindow = window as unknown as {
      api: { getConfig: () => Promise<{ apiBaseUrl: string }> };
    };
    const config = await appWindow.api.getConfig();
    const auth = JSON.parse(sessionStorage.getItem("pos-auth") || "null") as {
      state?: { token?: string };
    } | null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await fetch(
        `${config.apiBaseUrl}/api/pos/seat/selecting-chairs/${screeningId}`,
        { headers: { Authorization: `Bearer ${auth?.state?.token || ""}` } }
      );

      if (response.ok) {
        const payload = (await response.json()) as
          | SelectingSnapshot[]
          | { data?: SelectingSnapshot[] };
        return Array.isArray(payload) ? payload : payload.data || [];
      }

      if (response.status !== 429 || attempt === 4) {
        throw new Error(`Selecting snapshot request failed: ${response.status}`);
      }

      const retryAfterSeconds = Number(response.headers.get("Retry-After") || "0");
      const retryDelay = Math.max(retryAfterSeconds * 1000, (attempt + 1) * 1500);
      await new Promise((resolve) => window.setTimeout(resolve, retryDelay));
    }

    return [];
  }, planScreenId);

const snapshotOwnersForSeat = (snapshots: SelectingSnapshot[], seatKey: string) => {
  const [floor, seatIndex] = seatKey.split("-");
  const normalizedSeatIndex = seatIndex.replace(/^\[|\]$/g, "");
  const field = `selectingChairIndexF${floor}` as keyof SelectingSnapshot;
  const owners = new Set<string>();

  snapshots.forEach((snapshot) => {
    const value = String(snapshot[field] || "");
    const indexes = Array.from(value.matchAll(/\[([^\]]+)\]/g)).map((match) => match[1]);
    const normalizedIndexes = indexes.length > 0 ? indexes : value.split(",");

    if (
      normalizedIndexes
        .map((index) => index.trim().replace(/^\[|\]$/g, ""))
        .includes(normalizedSeatIndex)
    ) {
      owners.add(snapshot.posName);
    }
  });

  return owners;
};

const readSeatState = async (page: Page, seatKey: string): Promise<UiSeatState> => {
  const className =
    (await page.locator(`[data-seat-unique-key="${seatKey}"]`).getAttribute("class")) || "";

  return {
    selected: className.includes("bg-whis"),
    pending: className.includes("ring-sky-300"),
    conflicted: className.includes("ring-red-500"),
    selectingByOther: className.includes("ring-primary/70"),
    className
  };
};

const saveSessionArtifacts = async (sessions: PosSession[], artifactRoot: string) => {
  for (const session of sessions) {
    await writeFile(
      path.join(artifactRoot, `${session.posName.toLowerCase()}-timeline.log`),
      `${session.events.join("\n")}\n`,
      "utf8"
    );
    const processId = session.app.process().pid;
    await Promise.race([
      session.app.evaluate(({ app }) => app.exit(0)).catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, 2000))
    ]);
    if (process.platform === "win32") {
      await execFileAsync("taskkill", ["/PID", String(processId), "/T", "/F"]).catch(
        () => undefined
      );
    } else {
      session.app.process().kill("SIGKILL");
    }
  }
};

const openSameShowtime = async (
  posA: PosSession,
  posB: PosSession,
  date: string,
  showtimeLabel: string
) => {
  await Promise.all([openShowtimesDate(posA, date), openShowtimesDate(posB, date)]);
  const posAButton = posA.page.getByRole("button", { name: showtimeLabel, exact: true }).first();
  const posBButton = posB.page.getByRole("button", { name: showtimeLabel, exact: true }).first();
  await Promise.all([expect(posAButton).toBeVisible(), expect(posBButton).toBeVisible()]);

  await Promise.all([posAButton.click(), posBButton.click()]);
  await Promise.all([
    posA.page.waitForURL(/#\/plan-screening\/\d+/),
    posB.page.waitForURL(/#\/plan-screening\/\d+/)
  ]);

  const planScreeningA = posA.page.url().match(/plan-screening\/(\d+)/)?.[1];
  const planScreeningB = posB.page.url().match(/plan-screening\/(\d+)/)?.[1];
  expect(planScreeningA).toBe(planScreeningB);
  expect(planScreeningA).toBeTruthy();

  await Promise.all([
    posA.page.locator("[data-seat-code]").first().waitFor({ state: "visible", timeout: 30000 }),
    posB.page.locator("[data-seat-code]").first().waitFor({ state: "visible", timeout: 30000 })
  ]);
  await Promise.all([addPosBadge(posA.page, posA.posName), addPosBadge(posB.page, posB.posName)]);

  return Number(planScreeningA);
};

test("phase 2-3 - concurrent seat selection resolves to at most one POS", async ({}, testInfo) => {
  test.skip(!username || !password, "E2E_POS_USERNAME and E2E_POS_PASSWORD are required");
  test.skip(
    !requestedShowtimeDate || !requestedShowtimeLabel,
    "E2E_SHOWTIME_DATE and E2E_SHOWTIME_LABEL are required"
  );

  const artifactRoot = testInfo.outputPath("multi-pos-artifacts");
  const profileRoot = path.join(artifactRoot, "profiles");
  const videoRoot = path.join(artifactRoot, "videos");
  await mkdir(profileRoot, { recursive: true });
  await mkdir(videoRoot, { recursive: true });

  const sessions: PosSession[] = [];

  try {
    const [posA, posB] = await Promise.all([
      launchPos(
        "POS-A",
        "PA",
        path.join(profileRoot, "pos-a"),
        path.join(videoRoot, "pos-a"),
        "left"
      ),
      launchPos(
        "POS-B",
        "PB",
        path.join(profileRoot, "pos-b"),
        path.join(videoRoot, "pos-b"),
        "right"
      )
    ]);
    sessions.push(posA, posB);
    await Promise.all([loginThroughUi(posA), loginThroughUi(posB)]);

    const planScreeningId = await openSameShowtime(
      posA,
      posB,
      requestedShowtimeDate!,
      requestedShowtimeLabel!
    );
    const [availableA, availableB, initialSnapshots] = await Promise.all([
      posA.page.locator(".selectable-seat[data-seat-unique-key]").evaluateAll((elements) =>
        elements
          .filter((element) => (element as HTMLElement).offsetParent !== null)
          .map((element) => ({
            key: element.getAttribute("data-seat-unique-key") || "",
            code: element.getAttribute("data-seat-code") || ""
          }))
      ),
      posB.page.locator(".selectable-seat[data-seat-unique-key]").evaluateAll((elements) =>
        elements
          .filter((element) => (element as HTMLElement).offsetParent !== null)
          .map((element) => ({
            key: element.getAttribute("data-seat-unique-key") || "",
            code: element.getAttribute("data-seat-code") || ""
          }))
      ),
      getSelectingSnapshots(posA.page, planScreeningId)
    ]);
    const availableBKeys = new Set(availableB.map((seat) => seat.key));
    const testSeat = availableA.find(
      (seat) =>
        seat.key &&
        seat.code &&
        availableBKeys.has(seat.key) &&
        snapshotOwnersForSeat(initialSnapshots, seat.key).size === 0
    );
    expect(testSeat, "No common unowned selectable seat was found").toBeTruthy();

    const seatA = posA.page.locator(`[data-seat-unique-key="${testSeat!.key}"]`);
    const seatB = posB.page.locator(`[data-seat-unique-key="${testSeat!.key}"]`);
    const testHeader = `TEST_SEAT code=${testSeat!.code} key=${testSeat!.key} planScreeningId=${planScreeningId}`;
    posA.events.push(`${timestamp()} ${testHeader}`);
    posB.events.push(`${timestamp()} ${testHeader}`);

    const snapshotUrl = `**/api/pos/seat/selecting-chairs/${planScreeningId}`;
    const addUrl = "**/api/pos/seat/selecting-chairs/add";
    const delayedSnapshotCounts = { posA: 0, posB: 0 };
    await Promise.all([
      posA.page.route(snapshotUrl, async (route) => {
        delayedSnapshotCounts.posA += 1;
        if (delayedSnapshotCounts.posA <= 4) {
          await new Promise((resolve) => setTimeout(resolve, 3500));
        }
        await route.continue();
      }),
      posB.page.route(snapshotUrl, async (route) => {
        delayedSnapshotCounts.posB += 1;
        if (delayedSnapshotCounts.posB <= 4) {
          await new Promise((resolve) => setTimeout(resolve, 3500));
        }
        await route.continue();
      }),
      posA.page.route(addUrl, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        await route.continue();
      }),
      posB.page.route(addUrl, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        await route.continue();
      })
    ]);

    await Promise.all([
      posA.page.screenshot({ path: path.join(artifactRoot, "01-before-click-pos-a.png") }),
      posB.page.screenshot({ path: path.join(artifactRoot, "01-before-click-pos-b.png") })
    ]);
    await posA.page.waitForTimeout(3000);

    const clickStartedAt = timestamp();
    posA.events.push(`${clickStartedAt} POS-A click ${testSeat!.code} START`);
    posB.events.push(`${clickStartedAt} POS-B click ${testSeat!.code} START`);
    await Promise.all([seatA.click(), seatB.click()]);
    const clickCompletedAt = timestamp();
    posA.events.push(`${clickCompletedAt} POS-A click ${testSeat!.code} COMPLETE`);
    posB.events.push(`${clickCompletedAt} POS-B click ${testSeat!.code} COMPLETE`);

    await Promise.all([
      posA.page.screenshot({ path: path.join(artifactRoot, "02-both-pending-pos-a.png") }),
      posB.page.screenshot({ path: path.join(artifactRoot, "02-both-pending-pos-b.png") })
    ]);

    let previousA = "";
    let previousB = "";
    let conflictCaptured = false;
    for (let sample = 0; sample < 50; sample += 1) {
      const [stateA, stateB] = await Promise.all([
        readSeatState(posA.page, testSeat!.key),
        readSeatState(posB.page, testSeat!.key)
      ]);
      const summaryA = JSON.stringify({
        selected: stateA.selected,
        pending: stateA.pending,
        conflicted: stateA.conflicted,
        selectingByOther: stateA.selectingByOther
      });
      const summaryB = JSON.stringify({
        selected: stateB.selected,
        pending: stateB.pending,
        conflicted: stateB.conflicted,
        selectingByOther: stateB.selectingByOther
      });

      if (summaryA !== previousA) {
        posA.events.push(`${timestamp()} SEAT_STATE ${testSeat!.code} ${summaryA}`);
        previousA = summaryA;
      }
      if (summaryB !== previousB) {
        posB.events.push(`${timestamp()} SEAT_STATE ${testSeat!.code} ${summaryB}`);
        previousB = summaryB;
      }
      if (!conflictCaptured && (stateA.conflicted || stateB.conflicted)) {
        await Promise.all([
          posA.page.screenshot({ path: path.join(artifactRoot, "03-conflict-pos-a.png") }),
          posB.page.screenshot({ path: path.join(artifactRoot, "03-conflict-pos-b.png") })
        ]);
        conflictCaptured = true;
      }

      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    let finalSnapshots: SelectingSnapshot[] = [];
    let finalOwners = new Set<string>();
    let finalStateA = await readSeatState(posA.page, testSeat!.key);
    let finalStateB = await readSeatState(posB.page, testSeat!.key);

    for (let attempt = 0; attempt < 40; attempt += 1) {
      finalSnapshots = await getSelectingSnapshots(posA.page, planScreeningId);
      finalOwners = snapshotOwnersForSeat(finalSnapshots, testSeat!.key);
      [finalStateA, finalStateB] = await Promise.all([
        readSeatState(posA.page, testSeat!.key),
        readSeatState(posB.page, testSeat!.key)
      ]);
      const confirmedA = finalStateA.selected && !finalStateA.pending && !finalStateA.conflicted;
      const confirmedB = finalStateB.selected && !finalStateB.pending && !finalStateB.conflicted;
      const uiMatchesSnapshot =
        (finalOwners.size === 0 && !confirmedA && !confirmedB) ||
        (finalOwners.size === 1 &&
          ((finalOwners.has("POS-A") && confirmedA && !confirmedB) ||
            (finalOwners.has("POS-B") && confirmedB && !confirmedA)));

      if (finalOwners.size <= 1 && uiMatchesSnapshot) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const confirmedA = finalStateA.selected && !finalStateA.pending && !finalStateA.conflicted;
    const confirmedB = finalStateB.selected && !finalStateB.pending && !finalStateB.conflicted;
    const finalSummary = `FINAL owners=${Array.from(finalOwners).join(",") || "none"} confirmedA=${confirmedA} confirmedB=${confirmedB}`;
    posA.events.push(`${timestamp()} ${finalSummary}`);
    posB.events.push(`${timestamp()} ${finalSummary}`);

    if (!conflictCaptured) {
      await Promise.all([
        posA.page.screenshot({ path: path.join(artifactRoot, "03-conflict-pos-a.png") }),
        posB.page.screenshot({ path: path.join(artifactRoot, "03-conflict-pos-b.png") })
      ]);
    }
    await Promise.all([
      posA.page.screenshot({ path: path.join(artifactRoot, "04-after-reconcile-pos-a.png") }),
      posB.page.screenshot({ path: path.join(artifactRoot, "04-after-reconcile-pos-b.png") }),
      posA.page.screenshot({ path: path.join(artifactRoot, "05-final-owner-pos-a.png") }),
      posB.page.screenshot({ path: path.join(artifactRoot, "05-final-owner-pos-b.png") })
    ]);

    await posA.page.waitForTimeout(5000);

    await Promise.all([
      posA.page.unroute(snapshotUrl),
      posB.page.unroute(snapshotUrl),
      posA.page.unroute(addUrl),
      posB.page.unroute(addUrl)
    ]);

    if (finalStateA.selected) await seatA.click();
    if (finalStateB.selected) await seatB.click();
    await posA.page.waitForTimeout(1000);

    expect(Number(confirmedA) + Number(confirmedB)).toBeLessThanOrEqual(1);
    expect(finalOwners.size).toBeLessThanOrEqual(1);
    if (confirmedA) expect(Array.from(finalOwners)).toEqual(["POS-A"]);
    if (confirmedB) expect(Array.from(finalOwners)).toEqual(["POS-B"]);
    if (finalOwners.size === 0) {
      expect(confirmedA).toBe(false);
      expect(confirmedB).toBe(false);
    }
  } finally {
    await saveSessionArtifacts(sessions, artifactRoot);
  }
});

test("phase 3b - conflicted pending seat can be unselected while the other POS keeps ownership", async ({}, testInfo) => {
  test.skip(!username || !password, "E2E_POS_USERNAME and E2E_POS_PASSWORD are required");
  test.skip(
    !requestedShowtimeDate || !requestedShowtimeLabel,
    "E2E_SHOWTIME_DATE and E2E_SHOWTIME_LABEL are required"
  );

  const artifactRoot = testInfo.outputPath("multi-pos-artifacts");
  const profileRoot = path.join(artifactRoot, "profiles");
  const videoRoot = path.join(artifactRoot, "videos");
  await mkdir(profileRoot, { recursive: true });
  await mkdir(videoRoot, { recursive: true });
  const sessions: PosSession[] = [];

  try {
    const [posA, posB] = await Promise.all([
      launchPos(
        "POS-A",
        "PA",
        path.join(profileRoot, "pos-a"),
        path.join(videoRoot, "pos-a"),
        "left"
      ),
      launchPos(
        "POS-B",
        "PB",
        path.join(profileRoot, "pos-b"),
        path.join(videoRoot, "pos-b"),
        "right"
      )
    ]);
    sessions.push(posA, posB);
    await Promise.all([loginThroughUi(posA), loginThroughUi(posB)]);
    const planScreeningId = await openSameShowtime(
      posA,
      posB,
      requestedShowtimeDate!,
      requestedShowtimeLabel!
    );
    const testSeat = await findCommonUnownedSeat(posA, posB, planScreeningId);
    expect(testSeat, "No common unowned selectable seat was found").toBeTruthy();

    const seatA = posA.page.locator(`[data-seat-unique-key="${testSeat!.key}"]`);
    const seatB = posB.page.locator(`[data-seat-unique-key="${testSeat!.key}"]`);
    const addUrl = "**/api/pos/seat/selecting-chairs/add";
    const snapshotUrl = `**/api/pos/seat/selecting-chairs/${planScreeningId}`;
    let posAAddStarted = false;
    await Promise.all([
      posA.page.route(addUrl, async (route) => {
        posAAddStarted = true;
        posA.events.push(`${timestamp()} POS-A delayed add START ${testSeat!.code}`);
        await new Promise((resolve) => setTimeout(resolve, 3500));
        await route.continue();
        posA.events.push(`${timestamp()} POS-A delayed add CONTINUE ${testSeat!.code}`);
      }),
      posA.page.route(snapshotUrl, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        try {
          await route.continue();
        } catch (error) {
          if (error instanceof Error && error.message.includes("Route is already handled")) {
            return;
          }
          throw error;
        }
      })
    ]);

    await seatA.click();
    await expect.poll(() => posAAddStarted, { timeout: 3000 }).toBe(true);
    await expect
      .poll(async () => (await readSeatState(posA.page, testSeat!.key)).pending, { timeout: 3000 })
      .toBe(true);
    posA.events.push(`${timestamp()} POS-A pending ${testSeat!.code}`);

    await seatB.click();
    posB.events.push(`${timestamp()} POS-B click ${testSeat!.code}`);
    await expect
      .poll(
        async () => {
          const stateA = await readSeatState(posA.page, testSeat!.key);
          return stateA.selected && stateA.conflicted;
        },
        { timeout: 3000, intervals: [50, 100, 200] }
      )
      .toBe(true);
    posA.events.push(`${timestamp()} POS-A conflict while pending ${testSeat!.code}`);
    await Promise.all([
      posA.page.screenshot({ path: path.join(artifactRoot, "01-pos-a-conflicted-pending.png") }),
      posB.page.screenshot({ path: path.join(artifactRoot, "01-pos-b-owner.png") })
    ]);

    await seatA.click();
    posA.events.push(`${timestamp()} POS-A unselect conflict ${testSeat!.code}`);
    await expect
      .poll(async () => (await readSeatState(posA.page, testSeat!.key)).selected, {
        timeout: 3000
      })
      .toBe(false);

    await posA.page.unrouteAll({ behavior: "ignoreErrors" });
    await expect
      .poll(
        async () => {
          const [stateA, stateB, snapshots] = await Promise.all([
            readSeatState(posA.page, testSeat!.key),
            readSeatState(posB.page, testSeat!.key),
            getSelectingSnapshots(posA.page, planScreeningId)
          ]);
          const owners = snapshotOwnersForSeat(snapshots, testSeat!.key);
          return {
            posASelected: stateA.selected,
            posAPending: stateA.pending,
            posBConfirmed: stateB.selected && !stateB.pending && !stateB.conflicted,
            owners: Array.from(owners).sort()
          };
        },
        { timeout: 15000, intervals: [100, 200, 300, 500] }
      )
      .toEqual({
        posASelected: false,
        posAPending: false,
        posBConfirmed: true,
        owners: ["POS-B"]
      });

    posA.events.push(`${timestamp()} FINAL owner=POS-B POS-A selected=false pending=false`);
    posB.events.push(`${timestamp()} FINAL owner=POS-B confirmed=true`);
    await Promise.all([
      posA.page.screenshot({ path: path.join(artifactRoot, "02-final-pos-a-unselected.png") }),
      posB.page.screenshot({ path: path.join(artifactRoot, "02-final-pos-b-confirmed.png") })
    ]);

    await seatB.click();
    await expect
      .poll(
        async () =>
          snapshotOwnersForSeat(
            await getSelectingSnapshots(posA.page, planScreeningId),
            testSeat!.key
          ).size,
        { timeout: 10000 }
      )
      .toBe(0);
  } finally {
    await saveSessionArtifacts(sessions, artifactRoot);
  }
});

const mutateSelectingSeatThroughApi = async (
  page: Page,
  operation: "add" | "remove",
  planScreenId: number,
  posName: string,
  seatKey: string
) =>
  page.evaluate(
    async ({ selectedOperation, screeningId, owner, targetSeatKey }) => {
      const appWindow = window as unknown as {
        api: { getConfig: () => Promise<{ apiBaseUrl: string }> };
      };
      const config = await appWindow.api.getConfig();
      const auth = JSON.parse(sessionStorage.getItem("pos-auth") || "null") as {
        state?: { token?: string };
      } | null;
      const [floor, ...seatParts] = targetSeatKey.split("-");
      const seatIndex = seatParts.join("-");
      const dto = {
        planScreenId: screeningId,
        posName: owner,
        selectingChairIndexF1: floor === "1" ? seatIndex : "",
        selectingChairIndexF2: floor === "2" ? seatIndex : "",
        selectingChairIndexF3: floor === "3" ? seatIndex : ""
      };
      const response = await fetch(
        `${config.apiBaseUrl}/api/pos/seat/selecting-chairs/${selectedOperation}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${auth?.state?.token || ""}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(dto)
        }
      );

      if (!response.ok) {
        throw new Error(`Selecting mutation failed: ${response.status}`);
      }
    },
    {
      selectedOperation: operation,
      screeningId: planScreenId,
      owner: posName,
      targetSeatKey: seatKey
    }
  );

const findCommonUnownedSeat = async (
  posA: PosSession,
  posB: PosSession,
  planScreeningId: number,
  excludedKeys: Set<string> = new Set()
) => {
  const [availableA, availableB, snapshots] = await Promise.all([
    posA.page.locator(".selectable-seat[data-seat-unique-key]").evaluateAll((elements) =>
      elements
        .filter((element) => (element as HTMLElement).offsetParent !== null)
        .map((element) => ({
          key: element.getAttribute("data-seat-unique-key") || "",
          code: element.getAttribute("data-seat-code") || ""
        }))
    ),
    posB.page
      .locator(".selectable-seat[data-seat-unique-key]")
      .evaluateAll((elements) =>
        elements
          .filter((element) => (element as HTMLElement).offsetParent !== null)
          .map((element) => element.getAttribute("data-seat-unique-key") || "")
      ),
    getSelectingSnapshots(posA.page, planScreeningId)
  ]);
  const availableBKeys = new Set(availableB);

  return availableA.find(
    (seat) =>
      seat.key &&
      seat.code &&
      !excludedKeys.has(seat.key) &&
      availableBKeys.has(seat.key) &&
      snapshotOwnersForSeat(snapshots, seat.key).size === 0
  );
};

const findCommonSelectableSeat = async (
  posA: PosSession,
  posB: PosSession,
  excludedKeys: Set<string>,
  snapshots?: SelectingSnapshot[]
) => {
  const [availableA, availableB] = await Promise.all([
    posA.page.locator(".selectable-seat[data-seat-unique-key]").evaluateAll((elements) =>
      elements
        .filter((element) => (element as HTMLElement).offsetParent !== null)
        .map((element) => ({
          key: element.getAttribute("data-seat-unique-key") || "",
          code: element.getAttribute("data-seat-code") || ""
        }))
    ),
    posB.page
      .locator(".selectable-seat[data-seat-unique-key]")
      .evaluateAll((elements) =>
        elements
          .filter((element) => (element as HTMLElement).offsetParent !== null)
          .map((element) => element.getAttribute("data-seat-unique-key") || "")
      )
  ]);
  const availableBKeys = new Set(availableB);

  return availableA.find(
    (seat) =>
      seat.key &&
      seat.code &&
      !excludedKeys.has(seat.key) &&
      availableBKeys.has(seat.key) &&
      (!snapshots || snapshotOwnersForSeat(snapshots, seat.key).size === 0)
  );
};

const waitForConfirmedOwnership = async (
  session: PosSession,
  planScreeningId: number,
  seatKey: string
) => {
  await expect
    .poll(
      async () => {
        const [state, snapshots] = await Promise.all([
          readSeatState(session.page, seatKey),
          getSelectingSnapshots(session.page, planScreeningId)
        ]);
        const owners = snapshotOwnersForSeat(snapshots, seatKey);
        return (
          state.selected &&
          !state.pending &&
          !state.conflicted &&
          owners.size === 1 &&
          owners.has(session.posName)
        );
      },
      { timeout: 15000, intervals: [100, 200, 300, 500] }
    )
    .toBe(true);
};

test("phase 4 - final verification blocks create order and hold after ownership changes", async ({}, testInfo) => {
  test.skip(!username || !password, "E2E_POS_USERNAME and E2E_POS_PASSWORD are required");
  test.skip(
    !requestedShowtimeDate || !requestedShowtimeLabel,
    "E2E_SHOWTIME_DATE and E2E_SHOWTIME_LABEL are required"
  );

  const artifactRoot = testInfo.outputPath("multi-pos-artifacts");
  const profileRoot = path.join(artifactRoot, "profiles");
  const videoRoot = path.join(artifactRoot, "videos");
  await mkdir(profileRoot, { recursive: true });
  await mkdir(videoRoot, { recursive: true });
  const sessions: PosSession[] = [];

  try {
    const [posA, posB] = await Promise.all([
      launchPos(
        "POS-A",
        "PA",
        path.join(profileRoot, "pos-a"),
        path.join(videoRoot, "pos-a"),
        "left"
      ),
      launchPos(
        "POS-B",
        "PB",
        path.join(profileRoot, "pos-b"),
        path.join(videoRoot, "pos-b"),
        "right"
      )
    ]);
    sessions.push(posA, posB);
    await Promise.all([loginThroughUi(posA), loginThroughUi(posB)]);
    const planScreeningId = await openSameShowtime(
      posA,
      posB,
      requestedShowtimeDate!,
      requestedShowtimeLabel!
    );

    const orderRequests: Array<{ timestamp: string; body: string | null }> = [];
    posA.page.on("request", (request) => {
      const pathname = new URL(request.url()).pathname;
      if (request.method() === "POST" && pathname === "/api/pos/order") {
        orderRequests.push({ timestamp: timestamp(), body: request.postData() });
      }
    });

    const excludedSeatKeys = new Set<string>();
    const scenarios = [
      { actionName: "In vé", artifactName: "create-order" },
      { actionName: "Giữ chỗ", artifactName: "hold" }
    ] as const;

    for (const scenario of scenarios) {
      const testSeat = await findCommonUnownedSeat(posA, posB, planScreeningId, excludedSeatKeys);
      expect(testSeat, `No seat found for ${scenario.actionName}`).toBeTruthy();
      excludedSeatKeys.add(testSeat!.key);
      const seatA = posA.page.locator(`[data-seat-unique-key="${testSeat!.key}"]`);
      const actionButton = posA.page
        .getByRole("button")
        .filter({ hasText: scenario.actionName })
        .first();

      posA.events.push(
        `${timestamp()} FINAL_VERIFY_SCENARIO action=${scenario.actionName} seat=${testSeat!.code} key=${testSeat!.key}`
      );
      await seatA.click();
      await waitForConfirmedOwnership(posA, planScreeningId, testSeat!.key);
      await expect(actionButton).toBeEnabled();
      await posA.page.waitForTimeout(2000);

      const requestsBeforeAction = orderRequests.length;
      let injectedConflict = false;
      const snapshotUrl = `**/api/pos/seat/selecting-chairs/${planScreeningId}`;
      await posA.page.route(snapshotUrl, async (route) => {
        if (!injectedConflict) {
          injectedConflict = true;
          const claimAt = timestamp();
          posA.events.push(
            `${claimAt} POS-B inject claim during final verification action=${scenario.actionName} seat=${testSeat!.code}`
          );
          posB.events.push(
            `${claimAt} POS-B inject claim during final verification action=${scenario.actionName} seat=${testSeat!.code}`
          );
          await mutateSelectingSeatThroughApi(
            posB.page,
            "add",
            planScreeningId,
            "POS-B",
            testSeat!.key
          );
          await new Promise((resolve) => setTimeout(resolve, 120));
        }
        await route.continue();
      });

      await actionButton.click();
      await expect.poll(() => injectedConflict, { timeout: 5000, intervals: [50, 100] }).toBe(true);
      await posA.page.waitForTimeout(1500);
      await posA.page.unroute(snapshotUrl);

      const requestsAfterAction = orderRequests.length;
      posA.events.push(
        `${timestamp()} FINAL_VERIFY_RESULT action=${scenario.actionName} orderRequests=${requestsAfterAction - requestsBeforeAction}`
      );
      await Promise.all([
        posA.page.screenshot({
          path: path.join(artifactRoot, `final-verify-${scenario.artifactName}-pos-a.png`)
        }),
        posB.page.screenshot({
          path: path.join(artifactRoot, `final-verify-${scenario.artifactName}-pos-b.png`)
        })
      ]);

      expect(requestsAfterAction).toBe(requestsBeforeAction);
      await expect
        .poll(async () => (await readSeatState(posA.page, testSeat!.key)).selected, {
          timeout: 10000,
          intervals: [100, 200, 500]
        })
        .toBe(false);

      await mutateSelectingSeatThroughApi(
        posB.page,
        "remove",
        planScreeningId,
        "POS-B",
        testSeat!.key
      );
      await expect
        .poll(
          async () => {
            const snapshots = await getSelectingSnapshots(posA.page, planScreeningId);
            return snapshotOwnersForSeat(snapshots, testSeat!.key).size;
          },
          { timeout: 10000, intervals: [100, 200, 500] }
        )
        .toBe(0);
    }

    expect(orderRequests).toHaveLength(0);
    await posA.page.waitForTimeout(5000);
  } finally {
    await saveSessionArtifacts(sessions, artifactRoot);
  }
});

test("phase 5 - rapid click retry backoff and showtime generation isolation", async ({}, testInfo) => {
  test.skip(!username || !password, "E2E_POS_USERNAME and E2E_POS_PASSWORD are required");
  test.skip(
    !requestedShowtimeDate || !requestedShowtimeLabel,
    "E2E_SHOWTIME_DATE and E2E_SHOWTIME_LABEL are required"
  );

  const artifactRoot = testInfo.outputPath("multi-pos-artifacts");
  const profileRoot = path.join(artifactRoot, "profiles");
  const videoRoot = path.join(artifactRoot, "videos");
  await mkdir(profileRoot, { recursive: true });
  await mkdir(videoRoot, { recursive: true });
  const sessions: PosSession[] = [];

  try {
    const [posA, posB] = await Promise.all([
      launchPos(
        "POS-A",
        "PA",
        path.join(profileRoot, "pos-a"),
        path.join(videoRoot, "pos-a"),
        "left"
      ),
      launchPos(
        "POS-B",
        "PB",
        path.join(profileRoot, "pos-b"),
        path.join(videoRoot, "pos-b"),
        "right"
      )
    ]);
    sessions.push(posA, posB);
    await Promise.all([loginThroughUi(posA), loginThroughUi(posB)]);
    const planScreeningId = await openSameShowtime(
      posA,
      posB,
      requestedShowtimeDate!,
      requestedShowtimeLabel!
    );
    const usedSeatKeys = new Set<string>();

    const rapidToggleSeat = await findCommonUnownedSeat(posA, posB, planScreeningId, usedSeatKeys);
    expect(rapidToggleSeat).toBeTruthy();
    usedSeatKeys.add(rapidToggleSeat!.key);
    let rapidToggleMutationCount = 0;
    const countRapidToggleMutation = (request: import("@playwright/test").Request) => {
      if (
        request.method() === "POST" &&
        /\/api\/pos\/seat\/selecting-chairs\/(add|remove)$/.test(request.url())
      ) {
        rapidToggleMutationCount += 1;
      }
    };
    posA.page.on("request", countRapidToggleMutation);
    const rapidToggleAt = timestamp();
    posA.events.push(
      `${rapidToggleAt} RAPID_TOGGLE seat=${rapidToggleSeat!.code} clicks=4 interval=same-event-loop`
    );
    await posA.page.evaluate((seatKey) => {
      const seat = document.querySelector<HTMLElement>(`[data-seat-unique-key="${seatKey}"]`);
      for (let click = 0; click < 4; click += 1) seat?.click();
    }, rapidToggleSeat!.key);
    await posA.page.waitForTimeout(500);
    posA.page.off("request", countRapidToggleMutation);
    const rapidToggleState = await readSeatState(posA.page, rapidToggleSeat!.key);
    const rapidToggleSnapshots = await getSelectingSnapshots(posA.page, planScreeningId);
    expect(rapidToggleState.selected).toBe(false);
    expect(snapshotOwnersForSeat(rapidToggleSnapshots, rapidToggleSeat!.key).size).toBe(0);
    expect(rapidToggleMutationCount).toBe(0);
    posA.events.push(
      `${timestamp()} RAPID_TOGGLE_RESULT selected=false mutationCount=${rapidToggleMutationCount}`
    );

    const rapidSeats: Array<{ key: string; code: string }> = [];
    for (let index = 0; index < 4; index += 1) {
      const seat = await findCommonUnownedSeat(posA, posB, planScreeningId, usedSeatKeys);
      expect(seat).toBeTruthy();
      usedSeatKeys.add(seat!.key);
      rapidSeats.push(seat!);
    }
    let rapidBatchAddCount = 0;
    const countRapidBatchAdd = (request: import("@playwright/test").Request) => {
      if (
        request.method() === "POST" &&
        request.url().endsWith("/api/pos/seat/selecting-chairs/add")
      ) {
        rapidBatchAddCount += 1;
      }
    };
    posA.page.on("request", countRapidBatchAdd);
    posA.events.push(
      `${timestamp()} RAPID_MULTI seats=${rapidSeats.map((seat) => seat.code).join(",")}`
    );
    await posA.page.evaluate(
      (seatKeys) => {
        seatKeys.forEach((seatKey) => {
          document.querySelector<HTMLElement>(`[data-seat-unique-key="${seatKey}"]`)?.click();
        });
      },
      rapidSeats.map((seat) => seat.key)
    );
    await expect
      .poll(
        async () => {
          const snapshots = await getSelectingSnapshots(posA.page, planScreeningId);
          return rapidSeats.every((seat) => {
            const owners = snapshotOwnersForSeat(snapshots, seat.key);
            return owners.size === 1 && owners.has("POS-A");
          });
        },
        { timeout: 15000, intervals: [100, 200, 500] }
      )
      .toBe(true);
    for (const seat of rapidSeats) {
      await waitForConfirmedOwnership(posA, planScreeningId, seat.key);
    }
    posA.page.off("request", countRapidBatchAdd);
    expect(rapidBatchAddCount).toBe(1);
    posA.events.push(
      `${timestamp()} RAPID_MULTI_RESULT confirmed=${rapidSeats.length} addRequests=${rapidBatchAddCount}`
    );
    await posA.page.screenshot({ path: path.join(artifactRoot, "rapid-multi-confirmed.png") });
    await posA.page.evaluate(
      (seatKeys) => {
        seatKeys.forEach((seatKey) => {
          document.querySelector<HTMLElement>(`[data-seat-unique-key="${seatKey}"]`)?.click();
        });
      },
      rapidSeats.map((seat) => seat.key)
    );
    await expect
      .poll(
        async () => {
          const snapshots = await getSelectingSnapshots(posA.page, planScreeningId);
          return rapidSeats.every((seat) => snapshotOwnersForSeat(snapshots, seat.key).size === 0);
        },
        { timeout: 15000, intervals: [100, 200, 500] }
      )
      .toBe(true);

    const retrySeat = await findCommonUnownedSeat(posA, posB, planScreeningId, usedSeatKeys);
    expect(retrySeat).toBeTruthy();
    usedSeatKeys.add(retrySeat!.key);
    const retryAttemptTimes: number[] = [];
    const addUrl = "**/api/pos/seat/selecting-chairs/add";
    await posA.page.route(addUrl, async (route) => {
      retryAttemptTimes.push(Date.now());
      posA.events.push(
        `${timestamp()} RETRY_ATTEMPT attempt=${retryAttemptTimes.length} seat=${retrySeat!.code}`
      );
      await route.abort("failed");
    });
    await posA.page.locator(`[data-seat-unique-key="${retrySeat!.key}"]`).click();
    await expect
      .poll(() => retryAttemptTimes.length, {
        timeout: 10000,
        intervals: [100, 200, 500]
      })
      .toBe(4);
    await expect
      .poll(async () => (await readSeatState(posA.page, retrySeat!.key)).selected, {
        timeout: 10000,
        intervals: [100, 200, 500]
      })
      .toBe(false);
    const retryIntervals = retryAttemptTimes
      .slice(1)
      .map((time, index) => time - retryAttemptTimes[index]);
    posA.events.push(
      `${timestamp()} RETRY_EXHAUSTED attempts=${retryAttemptTimes.length} intervalsMs=${retryIntervals.join(",")}`
    );
    expect(retryIntervals[0]).toBeGreaterThanOrEqual(200);
    expect(retryIntervals[1]).toBeGreaterThanOrEqual(450);
    expect(retryIntervals[2]).toBeGreaterThanOrEqual(900);
    const exhaustedAttemptCount = retryAttemptTimes.length;
    await posA.page.waitForTimeout(1500);
    expect(retryAttemptTimes).toHaveLength(exhaustedAttemptCount);
    await posA.page.screenshot({ path: path.join(artifactRoot, "retry-exhausted.png") });
    await posA.page.unroute(addUrl);

    const generationSeat = await findCommonUnownedSeat(posA, posB, planScreeningId, usedSeatKeys);
    expect(generationSeat).toBeTruthy();
    let delayedAddStarted = false;
    let delayedAddCompleted = false;
    await posA.page.route(addUrl, async (route) => {
      if (!delayedAddStarted) {
        delayedAddStarted = true;
        posA.events.push(
          `${timestamp()} GENERATION_OLD_REQUEST_STARTED planScreeningId=${planScreeningId} seat=${generationSeat!.code}`
        );
        await new Promise((resolve) => setTimeout(resolve, 1500));
        await route.continue();
        delayedAddCompleted = true;
        posA.events.push(
          `${timestamp()} GENERATION_OLD_RESPONSE_RECEIVED planScreeningId=${planScreeningId}`
        );
        return;
      }
      await route.continue();
    });
    await posA.page.locator(`[data-seat-unique-key="${generationSeat!.key}"]`).click();
    await expect.poll(() => delayedAddStarted, { timeout: 5000, intervals: [50, 100] }).toBe(true);
    await posA.page.getByRole("button", { name: "Đóng", exact: true }).click();
    await expect(posA.page.getByRole("heading", { name: "Danh sách phim đang chiếu" })).toBeVisible(
      { timeout: 30000 }
    );
    posA.events.push(`${timestamp()} GENERATION_CHANGED oldPlanScreeningId=${planScreeningId}`);

    let alternateShowtimes = showtimeButtons(posA.page);
    let alternateCount = await alternateShowtimes.count();
    let alternateDate = requestedShowtimeDate!;

    if (alternateCount <= 1) {
      const availableDates = (await getAvailableDates(posA.page))
        .map(normalizeApiDate)
        .filter((date) => date !== requestedShowtimeDate && date !== formatDate(new Date()))
        .sort();
      const sameMonthDate = availableDates.find(
        (date) => date.slice(0, 7) === requestedShowtimeDate!.slice(0, 7)
      );
      const today = formatDate(new Date());
      const nearestAvailableDate = [
        ...availableDates.filter((date) => date > today),
        ...availableDates.filter((date) => date < today).reverse()
      ][0];
      alternateDate = sameMonthDate || nearestAvailableDate;
      expect(alternateDate, "No alternate showtime date is available").toBeTruthy();
      await openShowtimesDate(posA, alternateDate);
      alternateShowtimes = showtimeButtons(posA.page);
      alternateCount = await alternateShowtimes.count();
    }

    expect(alternateCount).toBeGreaterThan(0);
    const alternateLabels = (await alternateShowtimes.allTextContents()).map((label) =>
      label.trim()
    );
    const alternateIndex =
      alternateDate === requestedShowtimeDate
        ? Math.max(
            0,
            alternateLabels.findIndex((label) => label !== requestedShowtimeLabel)
          )
        : 0;
    await alternateShowtimes.nth(alternateIndex).click();
    await posA.page.waitForURL(/#\/plan-screening\/\d+/);
    const nextPlanScreeningId = Number(posA.page.url().match(/plan-screening\/(\d+)/)?.[1]);
    expect(nextPlanScreeningId).not.toBe(planScreeningId);
    posA.events.push(
      `${timestamp()} GENERATION_NEW_SCREENING planScreeningId=${nextPlanScreeningId} date=${alternateDate} label=${alternateLabels[alternateIndex]}`
    );
    await posA.page.locator("[data-seat-code]").first().waitFor({
      state: "visible",
      timeout: 30000
    });
    await expect
      .poll(() => delayedAddCompleted, { timeout: 5000, intervals: [100, 200] })
      .toBe(true);
    await posA.page.waitForTimeout(1000);
    const staleSelectedCount = await posA.page.locator("[data-seat-code].bg-whis").count();
    const stalePendingCount = await posA.page.locator("[data-seat-code].ring-sky-300").count();
    const staleConflictCount = await posA.page.locator("[data-seat-code].ring-red-500").count();
    expect(staleSelectedCount).toBe(0);
    expect(stalePendingCount).toBe(0);
    expect(staleConflictCount).toBe(0);
    await expect
      .poll(
        async () => {
          const snapshots = await getSelectingSnapshots(posB.page, planScreeningId);
          return snapshotOwnersForSeat(snapshots, generationSeat!.key).size;
        },
        { timeout: 10000, intervals: [100, 200, 500] }
      )
      .toBe(0);
    posA.events.push(
      `${timestamp()} GENERATION_OLD_RESPONSE_IGNORED selected=${staleSelectedCount} pending=${stalePendingCount} conflicted=${staleConflictCount}`
    );
    await posA.page.screenshot({ path: path.join(artifactRoot, "generation-isolated.png") });
    await posA.page.unroute(addUrl);
    await posA.page.waitForTimeout(5000);
  } finally {
    await saveSessionArtifacts(sessions, artifactRoot);
  }
});

test("phase 6 - 30 iteration multi POS concurrency stress", async ({}, testInfo) => {
  test.skip(!username || !password, "E2E_POS_USERNAME and E2E_POS_PASSWORD are required");
  test.skip(
    !requestedShowtimeDate || !requestedShowtimeLabel,
    "E2E_SHOWTIME_DATE and E2E_SHOWTIME_LABEL are required"
  );

  const artifactRoot = testInfo.outputPath("multi-pos-artifacts");
  const profileRoot = path.join(artifactRoot, "profiles");
  const videoRoot = path.join(artifactRoot, "videos");
  await mkdir(profileRoot, { recursive: true });
  await mkdir(videoRoot, { recursive: true });
  const sessions: PosSession[] = [];
  const iterations = 30;
  const summary = {
    total: iterations,
    passed: 0,
    failed: 0,
    doubleOwnership: 0,
    stuckPending: 0,
    incorrectConflict: 0,
    incorrectFinalOwnership: 0,
    infiniteRetry: 0,
    staleGenerationMutation: 0,
    duplicateOwnershipObserved: 0,
    failures: [] as Array<Record<string, unknown>>
  };

  try {
    const [posA, posB] = await Promise.all([
      launchPos(
        "POS-A",
        "PA",
        path.join(profileRoot, "pos-a"),
        path.join(videoRoot, "pos-a"),
        "left"
      ),
      launchPos(
        "POS-B",
        "PB",
        path.join(profileRoot, "pos-b"),
        path.join(videoRoot, "pos-b"),
        "right"
      )
    ]);
    sessions.push(posA, posB);
    await Promise.all([loginThroughUi(posA), loginThroughUi(posB)]);
    const planScreeningId = await openSameShowtime(
      posA,
      posB,
      requestedShowtimeDate!,
      requestedShowtimeLabel!
    );
    const usedSeatKeys = new Set<string>();
    await posA.page.waitForTimeout(5000);
    const initialStressSnapshots = await getSelectingSnapshots(posA.page, planScreeningId);

    for (let iteration = 1; iteration <= iterations; iteration += 1) {
      const testSeat = await findCommonSelectableSeat(
        posA,
        posB,
        usedSeatKeys,
        initialStressSnapshots
      );

      if (!testSeat) {
        summary.failed += 1;
        summary.failures.push({ iteration, reason: "No common unowned seat" });
        break;
      }
      usedSeatKeys.add(testSeat.key);
      const seatA = posA.page.locator(`[data-seat-unique-key="${testSeat.key}"]`);
      const seatB = posB.page.locator(`[data-seat-unique-key="${testSeat.key}"]`);
      const clickAt = timestamp();
      posA.events.push(
        `${clickAt} STRESS iteration=${iteration} click seat=${testSeat.code} key=${testSeat.key}`
      );
      posB.events.push(
        `${clickAt} STRESS iteration=${iteration} click seat=${testSeat.code} key=${testSeat.key}`
      );
      await Promise.all([seatA.click(), seatB.click()]);

      let owners = new Set<string>();
      let stateA = await readSeatState(posA.page, testSeat.key);
      let stateB = await readSeatState(posB.page, testSeat.key);
      let settled = false;
      let duplicateObserved = false;

      await new Promise((resolve) => setTimeout(resolve, 350));
      const earlySnapshots = await getSelectingSnapshots(posA.page, planScreeningId);
      duplicateObserved = snapshotOwnersForSeat(earlySnapshots, testSeat.key).size > 1;
      await new Promise((resolve) => setTimeout(resolve, 1800));

      for (let attempt = 0; attempt < 8; attempt += 1) {
        const snapshots = await getSelectingSnapshots(posA.page, planScreeningId);
        owners = snapshotOwnersForSeat(snapshots, testSeat.key);
        [stateA, stateB] = await Promise.all([
          readSeatState(posA.page, testSeat.key),
          readSeatState(posB.page, testSeat.key)
        ]);
        if (owners.size > 1) duplicateObserved = true;

        const confirmedA = stateA.selected && !stateA.pending && !stateA.conflicted;
        const confirmedB = stateB.selected && !stateB.pending && !stateB.conflicted;
        const uiMatchesSnapshot =
          (owners.size === 0 && !confirmedA && !confirmedB) ||
          (owners.size === 1 &&
            ((owners.has("POS-A") && confirmedA && !confirmedB) ||
              (owners.has("POS-B") && confirmedB && !confirmedA)));

        if (
          owners.size <= 1 &&
          uiMatchesSnapshot &&
          !stateA.pending &&
          !stateB.pending &&
          !stateA.conflicted &&
          !stateB.conflicted
        ) {
          settled = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      if (duplicateObserved) summary.duplicateOwnershipObserved += 1;
      const confirmedA = stateA.selected && !stateA.pending && !stateA.conflicted;
      const confirmedB = stateB.selected && !stateB.pending && !stateB.conflicted;
      const confirmedCount = Number(confirmedA) + Number(confirmedB);
      const isDoubleOwnership = owners.size > 1 || confirmedCount > 1;
      const isStuckPending = !settled && (stateA.pending || stateB.pending);
      const uiMatchesSnapshot =
        (owners.size === 0 && !confirmedA && !confirmedB) ||
        (owners.size === 1 &&
          ((owners.has("POS-A") && confirmedA && !confirmedB) ||
            (owners.has("POS-B") && confirmedB && !confirmedA)));
      const failureReasons: string[] = [];
      if (isDoubleOwnership) {
        summary.doubleOwnership += 1;
        failureReasons.push("double ownership");
      }
      if (isStuckPending) {
        summary.stuckPending += 1;
        failureReasons.push("stuck pending");
      }
      if (!uiMatchesSnapshot) {
        summary.incorrectFinalOwnership += 1;
        failureReasons.push("UI ownership differs from snapshot");
      }
      if (!settled && failureReasons.length === 0) {
        failureReasons.push("did not settle within 6 seconds");
      }

      const iterationResult =
        `${timestamp()} STRESS_RESULT iteration=${iteration} seat=${testSeat.code} ` +
        `owners=${Array.from(owners).join(",") || "none"} confirmedA=${confirmedA} ` +
        `confirmedB=${confirmedB} duplicateObserved=${duplicateObserved} settled=${settled}`;
      posA.events.push(iterationResult);
      posB.events.push(iterationResult);

      if (failureReasons.length > 0) {
        summary.failed += 1;
        summary.failures.push({
          iteration,
          seat: testSeat,
          owners: Array.from(owners),
          stateA,
          stateB,
          duplicateObserved,
          reasons: failureReasons
        });
        await Promise.all([
          posA.page.screenshot({
            path: path.join(artifactRoot, `stress-failure-${iteration}-pos-a.png`)
          }),
          posB.page.screenshot({
            path: path.join(artifactRoot, `stress-failure-${iteration}-pos-b.png`)
          })
        ]);
      } else {
        summary.passed += 1;
      }

      if (stateA.selected) await seatA.click();
      if (stateB.selected) await seatB.click();
      if (owners.size > 0) {
        await Promise.all(
          Array.from(owners).map((owner) =>
            mutateSelectingSeatThroughApi(
              owner === "POS-A" ? posA.page : posB.page,
              "remove",
              planScreeningId,
              owner,
              testSeat.key
            )
          )
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 700));
      await expect
        .poll(
          async () => {
            const snapshots = await getSelectingSnapshots(posA.page, planScreeningId);
            return snapshotOwnersForSeat(snapshots, testSeat.key).size;
          },
          { timeout: 15000, intervals: [500, 1000, 1500] }
        )
        .toBe(0);
    }

    await writeFile(
      path.join(artifactRoot, "stress-summary.json"),
      `${JSON.stringify(summary, null, 2)}\n`,
      "utf8"
    );
    await posA.page.screenshot({ path: path.join(artifactRoot, "stress-final-pos-a.png") });
    await posB.page.screenshot({ path: path.join(artifactRoot, "stress-final-pos-b.png") });
    await posA.page.waitForTimeout(5000);
    expect(summary.failures).toEqual([]);
    expect(summary.passed).toBe(iterations);
  } finally {
    await saveSessionArtifacts(sessions, artifactRoot);
  }
});
