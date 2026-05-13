import { app, BrowserWindow, ipcMain } from "electron";
import { autoUpdater, UpdateInfo as ElectronUpdateInfo } from "electron-updater";
import { UpdateMode, UpdatePolicy } from "@shared/types";

const appReleaseChannel = process.env.APP_RELEASE_CHANNEL ?? "latest";
const defaultUpdatePolicyUrl =
  "https://raw.githubusercontent.com/hungnc051220/ncc-electron/main/src/main/update-policy.json";
const updatePolicyUrl = process.env.APP_UPDATE_POLICY_URL || defaultUpdatePolicyUrl;

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

async function fetchUpdatePolicy(): Promise<UpdatePolicy> {
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

function createUpdatePayload(info: ElectronUpdateInfo | { version: string }) {
  return {
    version: info.version,
    mode: latestMode,
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

    if (isDev) return null;

    const result = await autoUpdater.checkForUpdates();
    return result?.updateInfo ? createUpdatePayload(result.updateInfo) : null;
  });

  ipcMain.handle("app:start-download", () => {
    if (!isDev) autoUpdater.downloadUpdate();
  });

  ipcMain.handle("app:install-update", (_, options?: { isSilent?: boolean }) => {
    if (!isDev) autoUpdater.quitAndInstall(Boolean(options?.isSilent), true);
  });

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
