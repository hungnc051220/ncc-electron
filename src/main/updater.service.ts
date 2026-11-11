import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import { autoUpdater, UpdateInfo as ElectronUpdateInfo } from "electron-updater";
import {
  UpdateCheckResult,
  UpdateErrorCode,
  UpdateErrorPayload,
  UpdateErrorStage,
  UpdateMode,
  UpdatePolicy
} from "@shared/types";
import {
  appendUpdateErrorLog,
  classifyUpdateError,
  createUpdateErrorLogEntry,
  createUpdateErrorPayload
} from "./update-error";

const appReleaseChannel = process.env.APP_RELEASE_CHANNEL ?? "latest";
const defaultUpdatePolicyUrl =
  "https://raw.githubusercontent.com/hungnc051220/ncc-electron/main/src/main/update-policy.json";
const updatePolicyUrl = process.env.APP_UPDATE_POLICY_URL || defaultUpdatePolicyUrl;

let latestPolicy: UpdatePolicy | null = null;
let latestMode: UpdateMode = "optional";
let isCheckInProgress = false;
let isStartupCheck = false;
let isDownloadInProgress = false;
let isInstallRequested = false;
const reportedErrors = new WeakSet<object>();

function safeSend(win: BrowserWindow, channel: string, ...args: unknown[]) {
  if (win.isDestroyed() || win.webContents.isDestroyed()) {
    return;
  }

  win.webContents.send(channel, ...args);
}

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
  const currentVersion = app.getVersion();
  const minSupportedVersion = policy.minSupportedVersion;
  const latestVersion = policy.latestVersion;

  if (minSupportedVersion && compareVersions(currentVersion, minSupportedVersion) < 0) {
    return "force";
  }

  if (policy.mode === "force") {
    return latestVersion && compareVersions(currentVersion, latestVersion) < 0
      ? "force"
      : "optional";
  }

  return policy.mode;
}

function getUpdaterLogPath() {
  return join(app.getPath("logs"), "updater.log");
}

interface LogUpdateErrorOptions {
  error: unknown;
  stage: UpdateErrorStage;
  source: string;
  code?: UpdateErrorCode;
}

/** Ghi log kỹ thuật (đã che thông tin nhạy cảm) và trả về mã lỗi đã chuẩn hóa. */
function logUpdateError({ error, stage, source, code }: LogUpdateErrorOptions): UpdateErrorCode {
  const resolvedCode = code ?? classifyUpdateError(error, stage);
  const entry = createUpdateErrorLogEntry({
    error,
    code: resolvedCode,
    stage,
    source,
    appVersion: app.getVersion()
  });

  console.error("[updater]", JSON.stringify(entry));
  void appendUpdateErrorLog(getUpdaterLogPath(), entry);

  return resolvedCode;
}

interface ReportUpdateErrorOptions extends LogUpdateErrorOptions {
  notify: boolean;
}

/**
 * Một lỗi của electron-updater vừa phát event `error` vừa reject promise; WeakSet đảm bảo mỗi lỗi
 * chỉ được log và báo renderer một lần.
 */
function reportUpdateError(win: BrowserWindow, options: ReportUpdateErrorOptions) {
  const { error, stage, notify } = options;
  const isObjectError = Boolean(error) && typeof error === "object";

  if (isObjectError && reportedErrors.has(error as object)) {
    return createUpdateErrorPayload(options.code ?? classifyUpdateError(error, stage), stage);
  }

  if (isObjectError) {
    reportedErrors.add(error as object);
  }

  const payload: UpdateErrorPayload = createUpdateErrorPayload(logUpdateError(options), stage);

  if (notify) {
    safeSend(win, "update:error", payload);
  }

  return payload;
}

async function fetchUpdatePolicy(): Promise<UpdatePolicy> {
  if (!updatePolicyUrl) {
    return createFallbackPolicy();
  }

  try {
    const policyUrl = new URL(updatePolicyUrl);
    policyUrl.searchParams.set("_", Date.now().toString());

    const response = await fetch(policyUrl.toString(), {
      headers: {
        accept: "application/json",
        "cache-control": "no-cache, no-store, must-revalidate",
        pragma: "no-cache"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return normalizePolicy(await response.json());
  } catch (error) {
    logUpdateError({ error, stage: "check", source: "policy-fetch" });
    return createFallbackPolicy();
  }
}

function createUpdatePayload(info: ElectronUpdateInfo | { version: string }) {
  return {
    version: info.version,
    mode: latestMode,
    messages: latestPolicy?.messages,
    policy: latestPolicy ?? undefined
  };
}

function emitPolicy(win: BrowserWindow, policy: UpdatePolicy) {
  safeSend(win, "update:policy", {
    ...policy,
    mode: latestMode
  });
}

async function refreshPolicy(win?: BrowserWindow) {
  latestPolicy = await fetchUpdatePolicy();
  latestMode = resolvePolicyMode(latestPolicy);
  // Khi policy tạm dừng cập nhật, bản đã tải sẵn trong phiên này không tự cài lúc thoát app.
  autoUpdater.autoInstallOnAppQuit = latestPolicy.enabled;

  if (win) {
    emitPolicy(win, latestPolicy);
  }

  return {
    ...latestPolicy,
    mode: latestMode
  };
}

function getActiveStage(): UpdateErrorStage {
  if (isInstallRequested) return "install";
  if (isCheckInProgress) return "check";
  if (isDownloadInProgress) return "download";

  return "check";
}

async function runUpdateCheck(win: BrowserWindow, isStartup: boolean): Promise<UpdateCheckResult> {
  isCheckInProgress = true;
  // Lần kiểm tra chạy nền lúc khởi động chỉ ghi log khi lỗi, không làm phiền thu ngân.
  isStartupCheck = isStartup;

  try {
    const result = await autoUpdater.checkForUpdates();

    return {
      status: "checked",
      info: result?.updateInfo ? createUpdatePayload(result.updateInfo) : null
    };
  } catch (error) {
    const payload = reportUpdateError(win, {
      error,
      stage: "check",
      source: "checkForUpdates",
      notify: !isStartup
    });

    return { status: "failed", error: payload };
  } finally {
    isCheckInProgress = false;
    isStartupCheck = false;
  }
}

interface SetupUpdaterOptions {
  onInstallUpdateStateChange?: (isInstalling: boolean) => void;
}

export function setupUpdater(win: BrowserWindow, setupOptions?: SetupUpdaterOptions) {
  const isDev = !app.isPackaged;
  const isDevReleaseChannel = appReleaseChannel === "dev";

  const resetInstallState = () => {
    isInstallRequested = false;
    setupOptions?.onInstallUpdateStateChange?.(false);
  };

  ipcMain.handle("app:get-version", () => app.getVersion());

  ipcMain.handle("app:get-update-policy", async () => {
    return refreshPolicy(win);
  });

  ipcMain.handle("app:check-update", async (): Promise<UpdateCheckResult> => {
    const policy = await refreshPolicy(win);

    if (!policy.enabled) {
      return { status: "disabled" };
    }

    if (isDev) return { status: "checked", info: null };

    return runUpdateCheck(win, false);
  });

  ipcMain.handle("app:start-download", () => {
    if (isDev || latestPolicy?.enabled === false) return;

    isDownloadInProgress = true;
    // electron-updater tự gộp các lần gọi trùng khi đang tải, nên retry không tạo download thứ hai.
    void autoUpdater
      .downloadUpdate()
      .catch((error: unknown) => {
        reportUpdateError(win, {
          error,
          stage: "download",
          source: "downloadUpdate",
          notify: true
        });
      })
      .finally(() => {
        isDownloadInProgress = false;
      });
  });

  ipcMain.handle("app:install-update", (_, options?: { isSilent?: boolean }) => {
    if (isDev) {
      return;
    }

    if (process.platform === "linux" && !process.env.APPIMAGE) {
      reportUpdateError(win, {
        error: new Error("Linux package is not an AppImage (APPIMAGE env missing)"),
        stage: "install",
        source: "install-precheck",
        code: "UPDATE_MANUAL_INSTALL_REQUIRED",
        notify: true
      });
      return;
    }

    isInstallRequested = true;
    setupOptions?.onInstallUpdateStateChange?.(true);

    try {
      autoUpdater.quitAndInstall(Boolean(options?.isSilent), true);
    } catch (error) {
      reportUpdateError(win, { error, stage: "install", source: "quitAndInstall", notify: true });
      resetInstallState();
    }
  });

  if (isDev) return;

  autoUpdater.channel = isDevReleaseChannel ? "dev" : "latest";
  autoUpdater.allowPrerelease = isDevReleaseChannel;
  autoUpdater.autoDownload = false;

  autoUpdater.on("update-available", (info) => {
    safeSend(win, "update:available", createUpdatePayload(info));
  });

  autoUpdater.on("download-progress", (p) => {
    safeSend(win, "update:progress", {
      percent: Math.round(p.percent),
      transferred: p.transferred,
      total: p.total,
      bytesPerSecond: p.bytesPerSecond
    });
  });

  autoUpdater.on("update-downloaded", () => {
    safeSend(win, "update:ready", {
      mode: latestMode,
      policy: latestPolicy ?? undefined
    });
  });

  autoUpdater.on("error", (error) => {
    const stage = getActiveStage();

    reportUpdateError(win, {
      error,
      stage,
      source: "autoUpdater:error",
      notify: !(stage === "check" && isStartupCheck)
    });

    // quitAndInstall thất bại không throw mà chỉ phát event: trả app về trạng thái bình thường.
    if (stage === "install") {
      resetInstallState();
    }
  });

  void refreshPolicy(win).then((policy) =>
    policy.enabled ? runUpdateCheck(win, true) : undefined
  );
}
