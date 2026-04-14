import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import {
  AppConfig,
  AppTheme,
  CurrentSeatState,
  PlanScreeningDetailProps,
  PrintTicketPayload,
  QrState,
  SeatTypeProps
} from "@shared/types";
import { app, BrowserWindow, dialog, ipcMain, screen, shell } from "electron";
import { autoUpdater } from "electron-updater";
import fs from "fs";
import path, { join } from "path";
import icon from "../../resources/icon.ico?asset";
import { createPrintService } from "./print.service";
import ElectronStore from "electron-store";
import { getConfig, setConfig } from "./config.service";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Store = (ElectronStore as any).default ?? ElectronStore;

const store = new Store();
let currentTheme: AppTheme = store.get("theme", "light") as AppTheme;
const appReleaseChannel = process.env.APP_RELEASE_CHANNEL ?? "latest";
const enablePackagedDevTools = process.env.APP_ENABLE_DEVTOOLS === "true";
const enableMockUpdate = process.env.APP_MOCK_UPDATE === "true";
const enableMockUpdateProgress = process.env.APP_MOCK_UPDATE_PROGRESS === "true";
const mockUpdateVersion = process.env.APP_MOCK_UPDATE_VERSION || "9.9.9";
const mockUpdateProgressStepMs = Number(process.env.APP_MOCK_UPDATE_PROGRESS_STEP_MS || "550");
const mockUpdateProgressHoldAt = Number(process.env.APP_MOCK_UPDATE_PROGRESS_HOLD_AT || "");
const shouldEnableDevTools = is.dev || enablePackagedDevTools;
const mockDownloadProgressSteps = [8, 23, 41, 58, 76, 91, 100];

let mainWindow: BrowserWindow | null = null;
let customerWindow: BrowserWindow | null = null;
let currentScreeningData: PlanScreeningDetailProps | null = null;
let currentSeatTypes: SeatTypeProps[] = [];
let mockDownloadTimer: NodeJS.Timeout | null = null;
let mockDownloadCursor = 0;
let mockDownloadActive = false;
let mockDownloadPaused = false;

let currentSeatState: CurrentSeatState = {
  selectedSeats: [],
  cancelMode: false,
  selectedFloor: null
};

let currentQrState: QrState = {
  isOpen: false
};

const printService = createPrintService();

function createMockUpdateInfo() {
  return {
    version: mockUpdateVersion
  };
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
            win.webContents.send("update:ready");
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

function setupUpdater(win: BrowserWindow) {
  const isDev = !app.isPackaged;
  const isDevReleaseChannel = appReleaseChannel === "dev";

  ipcMain.handle("app:get-version", () => app.getVersion());

  ipcMain.handle("app:check-update", async () => {
    if (enableMockUpdate) {
      return createMockUpdateInfo();
    }

    if (isDev) return null;

    const result = await autoUpdater.checkForUpdates();
    return result?.updateInfo ?? null;
  });

  ipcMain.handle("app:start-download", () => {
    if (enableMockUpdate) {
      if (enableMockUpdateProgress) {
        simulateMockDownload(win);
      } else {
        win.webContents.send("update:ready");
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

  ipcMain.handle("app:install-update", () => {
    if (!isDev) autoUpdater.quitAndInstall();
  });

  if (enableMockUpdate) {
    win.webContents.once("did-finish-load", () => {
      setTimeout(() => {
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
    win.webContents.send("update:available", info);
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
    win.webContents.send("update:ready");
  });

  autoUpdater.on("error", (err) => {
    win.webContents.send("update:error", err.message);
  });

  autoUpdater.checkForUpdates();
}

function configureDebugTools(win: BrowserWindow, openOnStart = false) {
  if (!shouldEnableDevTools) {
    return;
  }

  win.webContents.on("before-input-event", (event, input) => {
    const key = input.key.toLowerCase();
    const toggleWithShortcut =
      input.type === "keyDown" &&
      (key === "f12" || ((input.control || input.meta) && input.shift && key === "i"));

    if (!toggleWithShortcut) {
      return;
    }

    event.preventDefault();

    if (win.webContents.isDevToolsOpened()) {
      win.webContents.closeDevTools();
      return;
    }

    win.webContents.openDevTools({ mode: "detach" });
  });

  if (openOnStart) {
    win.once("ready-to-show", () => {
      if (!win.isDestroyed()) {
        win.webContents.openDevTools({ mode: "detach" });
      }
    });
  }
}

function loadRenderer(win: BrowserWindow, route: string) {
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}#${route}`);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"), { hash: route });
  }
}

const getTemplatePath = () => {
  const candidates = app.isPackaged
    ? [
        path.join(process.resourcesPath, "resources", "ticket-template.html"),
        path.join(process.resourcesPath, "ticket-template.html"),
        path.join(app.getAppPath(), "resources", "ticket-template.html"),
        path.join(process.resourcesPath, "app.asar.unpacked", "resources", "ticket-template.html")
      ]
    : [path.join(__dirname, "../../resources/ticket-template.html")];

  const templatePath = candidates.find((candidate) => fs.existsSync(candidate));

  if (!templatePath) {
    throw new Error(
      `Không tìm thấy file ticket-template.html. Candidates: ${candidates.join(", ")}`
    );
  }

  return templatePath;
};

function renderTemplate(html, data) {
  let result = html;
  Object.entries(data).forEach(([key, value]) => {
    result = result.replaceAll(`{{${key}}}`, value);
  });
  return result;
}

function getExportTicketLogPath() {
  return path.join(app.getPath("userData"), "logs", "export-ticket.log");
}

function writeExportTicketLog(message: string, meta?: unknown) {
  try {
    const logPath = getExportTicketLogPath();
    fs.mkdirSync(path.dirname(logPath), { recursive: true });

    const timestamp = new Date().toISOString();
    const metaText =
      meta === undefined
        ? ""
        : ` ${typeof meta === "string" ? meta : JSON.stringify(meta, null, 2)}`;

    fs.appendFileSync(logPath, `[${timestamp}] ${message}${metaText}\n`, "utf-8");
  } catch (logError) {
    console.error("[export-ticket][log-write-failed]", logError);
  }
}

async function renderTicketImage(htmlContent, outputPath) {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    useContentSize: true,
    webPreferences: {
      offscreen: true
    }
  });

  await win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(htmlContent));

  // đợi font + image load
  await new Promise((res) => setTimeout(res, 1500));

  // Lấy kích thước thực
  const actualSize = await win.webContents.executeJavaScript(`
    (() => {
      // Tính toán kích thước thực của content
      const body = document.body;
      const html = document.documentElement;
      
      const width = Math.max(
        body.scrollWidth,
        body.offsetWidth,
        html.clientWidth,
        html.scrollWidth,
        html.offsetWidth
      );
      
      const height = Math.max(
        body.scrollHeight,
        body.offsetHeight,
        html.clientHeight,
        html.scrollHeight,
        html.offsetHeight
      );
      
      return { 
        width: Math.ceil(width), 
        height: Math.ceil(height),
        devicePixelRatio: window.devicePixelRatio || 1
      };
    })();
  `);

  // Resize window
  win.setContentSize(actualSize.width, actualSize.height);

  // Đợi resize
  await new Promise((res) => setTimeout(res, 300));

  // Capture với kích thước thực
  const image = await win.webContents.capturePage({
    x: 0,
    y: 0,
    width: actualSize.width,
    height: actualSize.height
  });

  fs.writeFileSync(outputPath, image.toPNG());

  win.destroy();
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    show: false,
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      devTools: shouldEnableDevTools
    },
    kiosk: true
  });

  configureDebugTools(mainWindow, enablePackagedDevTools);

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  setupUpdater(mainWindow);
}

function getExternalDisplay() {
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();

  const external = displays.find((d) => d.id !== primary.id);

  if (!external) {
    return null;
  }

  return external;
}

function createCustomerWindow(planScreeningId: number) {
  const externalDisplay = getExternalDisplay();

  if (!externalDisplay) {
    return;
  }

  if (customerWindow && !customerWindow.isDestroyed()) {
    customerWindow.focus();
    return;
  }

  customerWindow = new BrowserWindow({
    x: externalDisplay.bounds.x,
    y: externalDisplay.bounds.y,
    width: externalDisplay.bounds.width,
    height: externalDisplay.bounds.height,
    kiosk: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      devTools: shouldEnableDevTools
    }
  });

  configureDebugTools(customerWindow);

  loadRenderer(customerWindow, `/plan-screening/${planScreeningId}?view=customer`);

  customerWindow.on("closed", () => {
    customerWindow = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId("com.electron");

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  ipcMain.handle("get-config", () => {
    return getConfig();
  });

  ipcMain.handle("set-config", (_, config: AppConfig) => {
    setConfig(config);
  });

  ipcMain.handle("get-printers", async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return [];

    const printers = await win.webContents.getPrintersAsync();
    return printers;
  });

  ipcMain.handle("customer:open", async (_, id: number) => {
    createCustomerWindow(id);
  });

  ipcMain.handle("customer:close", async () => {
    if (!customerWindow || customerWindow.isDestroyed()) {
      return { success: false };
    }

    customerWindow.close();
    customerWindow = null;

    return { success: true };
  });

  ipcMain.on("customer:request-init", (event) => {
    event.sender.send("customer:update-data", {
      data: currentScreeningData,
      seatTypes: currentSeatTypes
    });
    event.sender.send("customer:seat-sync", currentSeatState);
  });

  ipcMain.on(
    "customer:update-data",
    (_, payload: { data: PlanScreeningDetailProps | null; seatTypes: SeatTypeProps[] }) => {
      currentScreeningData = payload?.data ?? null;
      currentSeatTypes = payload?.seatTypes ?? [];

      if (customerWindow && !customerWindow.isDestroyed()) {
        customerWindow.webContents.send("customer:update-data", payload);
      }
    }
  );

  ipcMain.on("booking:seat-update", (_, payload) => {
    // update state trung tâm
    currentSeatState = payload;

    // broadcast sang customer
    if (customerWindow && !customerWindow.isDestroyed()) {
      customerWindow.webContents.send("customer:seat-sync", currentSeatState);
    }
  });

  ipcMain.on("qr:open", (_, data) => {
    currentQrState = {
      isOpen: true,
      data
    };

    customerWindow?.webContents.send("qr:sync", currentQrState);
  });

  ipcMain.on("qr:close", () => {
    currentQrState = { isOpen: false };

    customerWindow?.webContents.send("qr:sync", currentQrState);
  });

  ipcMain.handle(
    "print-tickets",
    async (_, tickets: PrintTicketPayload[], printerName?: string) => {
      if (!tickets || tickets.length === 0) {
        throw new Error("No tickets to print");
      }

      if (!printerName) {
        throw new Error("No printer selected");
      }

      return printService.enqueue(async () => {
        for (const ticket of tickets) {
          await printService.printSingleTicket(ticket, printerName);
        }
      });
    }
  );

  ipcMain.on("theme:update", (_, theme: AppTheme) => {
    currentTheme = theme;
    store.set("theme", theme);

    mainWindow?.webContents.send("theme:update", theme);
    customerWindow?.webContents.send("theme:update", theme);
  });

  ipcMain.on("theme:request", (event) => {
    event.sender.send("theme:update", currentTheme);
  });

  function getDefaultExportDir() {
    if (!app.isPackaged) {
      return path.join(process.cwd(), "dev-data", "temp");
    }

    return path.join(app.getPath("downloads"), "ncc-system", "temp");
  }

  ipcMain.handle("get-default-export-folder", () => {
    const tempDir = getDefaultExportDir();

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    return tempDir;
  });

  ipcMain.handle("select-folder", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"]
    });

    if (result.canceled) return null;

    return result.filePaths[0];
  });

  ipcMain.handle("read-file", async (_, filePath) => {
    const data = await fs.promises.readFile(filePath);
    return new Uint8Array(data.buffer);
  });

  ipcMain.handle("save-file", async (event, payload) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const dialogOptions = {
      defaultPath: payload.defaultFileName,
      filters: payload.filters
    };
    const result = win
      ? await dialog.showSaveDialog(win, dialogOptions)
      : await dialog.showSaveDialog(dialogOptions);

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    try {
      await fs.promises.writeFile(result.filePath, Buffer.from(payload.content));
    } catch (error) {
      if (error && typeof error === "object" && "code" in error) {
        const errorCode = String(error.code);

        if (errorCode === "EBUSY" || errorCode === "EPERM" || errorCode === "EACCES") {
          throw new Error(
            "Không thể lưu file vì file đang được mở hoặc bị khóa bởi ứng dụng khác. Vui lòng đóng file rồi thử lại."
          );
        }
      }

      throw error;
    }

    return {
      canceled: false,
      filePath: result.filePath
    };
  });

  ipcMain.handle("export-ticket", async (_, payload) => {
    try {
      const templatePath = getTemplatePath();
      writeExportTicketLog("templatePath", templatePath);
      writeExportTicketLog("payload", {
        barCode: payload.barCode,
        folder: payload.folder,
        imageSource: payload.imageSource,
        filmName: payload.filmName
      });

      const htmlTemplate = fs.readFileSync(templatePath, "utf-8");

      const html = renderTemplate(htmlTemplate, {
        filmName: payload.filmName,
        filmNameEn: payload.filmNameEn,
        countryName: payload.countryName,
        duration: payload.duration,
        date: payload.date,
        datetime: payload.datetime,
        room: payload.room,
        seat: payload.seat,
        imageSource: payload.imageSource,
        qrImage: payload.qrImage,
        barCode: payload.barCode,
        categories: payload.categories,
        floor: payload.floor
      });

      const outputPath = path.join(payload.folder, `${payload.barCode}.png`);
      writeExportTicketLog("outputPath", outputPath);

      fs.mkdirSync(payload.folder, { recursive: true });

      await renderTicketImage(html, outputPath);

      writeExportTicketLog("success", outputPath);
      return outputPath;
    } catch (error) {
      console.error("[export-ticket] failed:", error);
      writeExportTicketLog("failed", {
        message: error instanceof Error ? error.message : "Unknown export-ticket error",
        stack: error instanceof Error ? error.stack : undefined
      });
      const message = error instanceof Error ? error.message : "Unknown export-ticket error";
      throw new Error(`Xuất vé thất bại: ${message}`);
    }
  });

  ipcMain.on("app:quit", () => {
    app.quit();
  });

  createWindow();

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
