import { app, BrowserWindow, ipcMain } from "electron";
import { autoUpdater, UpdateInfo as ElectronUpdateInfo } from "electron-updater";
import { UpdateMode, UpdatePolicy } from "@shared/types";

const appReleaseChannel = process.env.APP_RELEASE_CHANNEL ?? "latest";
const enableMockUpdate = process.env.APP_MOCK_UPDATE === "true";
const enableMockUpdateProgress = process.env.APP_MOCK_UPDATE_PROGRESS === "true";
const mockUpdateVersion = process.env.APP_MOCK_UPDATE_VERSION || "9.9.9";
const mockUpdateMode = normalizeUpdateMode(process.env.APP_MOCK_UPDATE_MODE);
const mockUpdateProgressStepMs = Number(process.env.APP_MOCK_UPDATE_PROGRESS_STEP_MS || "550");
const mockUpdateProgressHoldAt = Number(process.env.APP_MOCK_UPDATE_PROGRESS_HOLD_AT || "");
const defaultUpdatePolicyUrl =
  "https://raw.githubusercontent.com/hungnc051220/ncc-electron/refs/heads/main/src/main/update-policy.json";
const updatePolicyUrl = process.env.APP_UPDATE_POLICY_URL || defaultUpdatePolicyUrl;
const mockDownloadProgressSteps = [8, 23, 41, 58, 76, 91, 100];

let mockDownloadTimer: NodeJS.Timeout | null = null;
let mockDownloadCursor = 0;
let mockDownloadActive = false;
let mockDownloadPaused = false;
let latestPolicy: UpdatePolicy | null = null;
let latestMode: UpdateMode = "optional";

function normalizeUpdateMode(value?: string | null): UpdateMode {
  if (value === "silent" || value === "force" || value === "optional") {
    return value;
  }

  return "optional";
}

function compareVersions(a: string, b: string) {
  const left = a.split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0);
  const right = b.split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(left.length, right.length);

  for (let i = 0; i < length; i += 1) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);

    if (diff !== 0) {
      return diff > 0 ? 1 : -1;
    }
  }

  return 0;
}

function normalizePolicy(value: unknown): UpdatePolicy {
  if (!value || typeof value !== "object") {
    return createFallbackPolicy();
  }

  const raw = value as Partial<UpdatePolicy>;

  return {
    enabled: raw.enabled !== false,
    latestVersion: typeof raw.latestVersion === "string" ? raw.latestVersion : undefined,
    minSupportedVersion:
      typeof raw.minSupportedVersion === "string" ? raw.minSupportedVersion : undefined,
    mode: normalizeUpdateMode(raw.mode),
    message: typeof raw.message === "string" ? raw.message : undefined,
    messages: Array.isArray(raw.messages)
      ? raw.messages.filter((message): message is string => typeof message === "string")
      : undefined,
    releaseNotesUrl: typeof raw.releaseNotesUrl === "string" ? raw.releaseNotesUrl : undefined
  };
}

function createFallbackPolicy(): UpdatePolicy {
  return {
    enabled: true,
    minSupportedVersion: "0.0.0",
    mode: "optional"
  };
}

function resolvePolicyMode(policy: UpdatePolicy): UpdateMode {
  const minSupportedVersion = policy.minSupportedVersion;

  if (minSupportedVersion && compareVersions(app.getVersion(), minSupportedVersion) < 0) {
    return "force";
  }

  return policy.mode;
}

async function fetchUpdatePolicy(): Promise<UpdatePolicy> {
  if (enableMockUpdate) {
    return {
      enabled: true,
      latestVersion: mockUpdateVersion,
      minSupportedVersion: mockUpdateMode === "force" ? mockUpdateVersion : "0.0.0",
      mode: mockUpdateMode,
      message:
        mockUpdateMode === "force"
          ? "Phiên bản hiện tại cần cập nhật để tiếp tục sử dụng hệ thống."
          : "Có bản cập nhật mới sẵn sàng.",
      messages: [
        "Cải thiện độ ổn định của luồng cập nhật ứng dụng.",
        "Bổ sung chính sách cập nhật theo từng phiên bản."
      ]
    };
  }

  if (!updatePolicyUrl) {
    return createFallbackPolicy();
  }

  try {
    const response = await fetch(updatePolicyUrl, {
      headers: {
        accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return normalizePolicy(await response.json());
  } catch (error) {
    console.error("[updater] fetch policy failed", error);
    return createFallbackPolicy();
  }
}

function createMockUpdateInfo() {
  return {
    version: mockUpdateVersion,
    mode: latestMode,
    message: latestPolicy?.message,
    messages: latestPolicy?.messages,
    policy: latestPolicy ?? undefined
  };
}

function createUpdatePayload(info: ElectronUpdateInfo | { version: string }) {
  return {
    version: info.version,
    mode: latestMode,
    message: latestPolicy?.message,
    messages: latestPolicy?.messages,
    policy: latestPolicy ?? undefined
  };
}

function emitPolicy(win: BrowserWindow, policy: UpdatePolicy) {
  if (win.isDestroyed()) {
    return;
  }

  win.webContents.send("update:policy", {
    ...policy,
    mode: latestMode
  });
}

function emitMockUpdateAvailable(win: BrowserWindow) {
  if (win.isDestroyed()) {
    return;
  }

  win.webContents.send("update:available", createMockUpdateInfo());
}

function clearMockDownloadTimer() {
  if (mockDownloadTimer) {
    clearTimeout(mockDownloadTimer);
    mockDownloadTimer = null;
  }
}

function scheduleMockDownloadStep(win: BrowserWindow) {
  clearMockDownloadTimer();

  if (win.isDestroyed() || !mockDownloadActive || mockDownloadPaused) {
    return;
  }

  if (mockDownloadCursor >= mockDownloadProgressSteps.length) {
    mockDownloadActive = false;
    return;
  }

  const total = 42 * 1024 * 1024;

  mockDownloadTimer = setTimeout(
    () => {
      if (win.isDestroyed() || !mockDownloadActive || mockDownloadPaused) {
        return;
      }

      const currentIndex = mockDownloadCursor;
      const percent = mockDownloadProgressSteps[currentIndex];
      const previousPercent = currentIndex > 0 ? mockDownloadProgressSteps[currentIndex - 1] : 0;

      win.webContents.send("update:progress", {
        percent,
        transferred: Math.round((percent / 100) * total),
        total,
        bytesPerSecond: 1_500_000 + currentIndex * 180_000
      });

      mockDownloadCursor = currentIndex + 1;

      if (Number.isFinite(mockUpdateProgressHoldAt) && mockUpdateProgressHoldAt > 0) {
        const shouldHold =
          percent === mockUpdateProgressHoldAt ||
          (percent > mockUpdateProgressHoldAt && previousPercent < mockUpdateProgressHoldAt);

        if (shouldHold) {
          mockDownloadPaused = true;
          clearMockDownloadTimer();
          return;
        }
      }

      if (percent === 100) {
        mockDownloadActive = false;
        clearMockDownloadTimer();
        setTimeout(() => {
          if (!win.isDestroyed()) {
            win.webContents.send("update:ready", {
              mode: latestMode,
              policy: latestPolicy ?? undefined
            });
          }
        }, 350);
        return;
      }

      scheduleMockDownloadStep(win);
    },
    Math.max(100, mockUpdateProgressStepMs)
  );
}

function simulateMockDownload(win: BrowserWindow) {
  mockDownloadActive = true;
  mockDownloadPaused = false;
  mockDownloadCursor = 0;
  scheduleMockDownloadStep(win);
}

function pauseMockDownload() {
  if (!mockDownloadActive) {
    return;
  }

  mockDownloadPaused = true;
  clearMockDownloadTimer();
}

function resumeMockDownload(win: BrowserWindow) {
  if (!mockDownloadActive || !mockDownloadPaused) {
    return;
  }

  mockDownloadPaused = false;
  scheduleMockDownloadStep(win);
}

async function refreshPolicy(win?: BrowserWindow) {
  latestPolicy = await fetchUpdatePolicy();
  latestMode = resolvePolicyMode(latestPolicy);

  if (win) {
    emitPolicy(win, latestPolicy);
  }

  return {
    ...latestPolicy,
    mode: latestMode
  };
}

export function setupUpdater(win: BrowserWindow) {
  const isDev = !app.isPackaged;
  const isDevReleaseChannel = appReleaseChannel === "dev";

  ipcMain.handle("app:get-version", () => app.getVersion());

  ipcMain.handle("app:get-update-policy", async () => {
    return refreshPolicy(win);
  });

  ipcMain.handle("app:check-update", async () => {
    const policy = await refreshPolicy(win);

    if (!policy.enabled) {
      return null;
    }

    if (enableMockUpdate) {
      return createMockUpdateInfo();
    }

    if (isDev) return null;

    const result = await autoUpdater.checkForUpdates();
    return result?.updateInfo ? createUpdatePayload(result.updateInfo) : null;
  });

  ipcMain.handle("app:start-download", () => {
    if (enableMockUpdate) {
      if (enableMockUpdateProgress) {
        simulateMockDownload(win);
      } else {
        win.webContents.send("update:ready", {
          mode: latestMode,
          policy: latestPolicy ?? undefined
        });
      }

      return;
    }

    if (!isDev) autoUpdater.downloadUpdate();
  });

  ipcMain.handle("app:pause-mock-update-download", () => {
    if (enableMockUpdate && enableMockUpdateProgress) {
      pauseMockDownload();
    }
  });

  ipcMain.handle("app:resume-mock-update-download", () => {
    if (enableMockUpdate && enableMockUpdateProgress) {
      resumeMockDownload(win);
    }
  });

  ipcMain.handle("app:install-update", (_, options?: { isSilent?: boolean }) => {
    if (!isDev) autoUpdater.quitAndInstall(Boolean(options?.isSilent), true);
  });

  if (enableMockUpdate) {
    win.webContents.once("did-finish-load", () => {
      setTimeout(async () => {
        await refreshPolicy(win);
        emitMockUpdateAvailable(win);
      }, 1800);
    });

    return;
  }

  if (isDev) return;

  autoUpdater.channel = isDevReleaseChannel ? "dev" : "latest";
  autoUpdater.allowPrerelease = isDevReleaseChannel;
  autoUpdater.autoDownload = false;

  autoUpdater.on("update-available", (info) => {
    win.webContents.send("update:available", createUpdatePayload(info));
  });

  autoUpdater.on("download-progress", (p) => {
    win.webContents.send("update:progress", {
      percent: Math.round(p.percent),
      transferred: p.transferred,
      total: p.total,
      bytesPerSecond: p.bytesPerSecond
    });
  });

  autoUpdater.on("update-downloaded", () => {
    win.webContents.send("update:ready", {
      mode: latestMode,
      policy: latestPolicy ?? undefined
    });
  });

  autoUpdater.on("error", (err) => {
    win.webContents.send("update:error", err.message);
  });

  void refreshPolicy(win).then((policy) => {
    if (policy.enabled) {
      void autoUpdater.checkForUpdates();
    }
  });
}
