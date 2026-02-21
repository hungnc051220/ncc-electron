import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import {
  AppTheme,
  CurrentSeatState,
  PlanScreeningDetailProps,
  PrintTicketPayload,
  QrState
} from "@shared/types";
import { app, BrowserWindow, dialog, ipcMain, screen, shell } from "electron";
import { autoUpdater } from "electron-updater";
import fs from "fs";
import path, { join } from "path";
import icon from "../../resources/icon.png?asset";
import { createPrintService } from "./print.service";
import ElectronStore from "electron-store";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Store = (ElectronStore as any).default ?? ElectronStore;

const store = new Store();
let currentTheme: AppTheme = store.get("theme", "light") as AppTheme;

let mainWindow: BrowserWindow | null = null;
let customerWindow: BrowserWindow | null = null;
let currentScreeningData: PlanScreeningDetailProps | null = null;

let currentSeatState: CurrentSeatState = {
  selectedSeats: [],
  cancelMode: false
};

let currentQrState: QrState = {
  isOpen: false
};

const printService = createPrintService();

function setupUpdater(win: BrowserWindow) {
  const isDev = !app.isPackaged;

  ipcMain.handle("app:get-version", () => app.getVersion());

  ipcMain.handle("app:check-update", async () => {
    if (isDev) return null;

    const result = await autoUpdater.checkForUpdates();
    return result?.updateInfo ?? null;
  });

  ipcMain.handle("app:start-download", () => {
    if (!isDev) autoUpdater.downloadUpdate();
  });

  ipcMain.handle("app:install-update", () => {
    if (!isDev) autoUpdater.quitAndInstall();
  });

  if (isDev) return;

  autoUpdater.autoDownload = false;

  autoUpdater.on("update-available", (info) => {
    win.webContents.send("update:available", info);
  });

  autoUpdater.on("download-progress", (p) => {
    win.webContents.send("update:progress", Math.round(p.percent));
  });

  autoUpdater.on("update-downloaded", () => {
    win.webContents.send("update:ready");
  });

  autoUpdater.on("error", (err) => {
    win.webContents.send("update:error", err.message);
  });

  autoUpdater.checkForUpdates();
}

function loadRenderer(win: BrowserWindow, route: string) {
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}#${route}`);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"), { hash: route });
  }
}

const getTemplatePath = () => {
  if (app.isPackaged) {
    // khi đã build .exe
    return path.join(process.resourcesPath, "resources", "ticket-template.html");
  }

  // khi chạy dev
  return path.join(__dirname, "../../resources/ticket-template.html");
};

function renderTemplate(html, data) {
  let result = html;
  Object.entries(data).forEach(([key, value]) => {
    result = result.replaceAll(`{{${key}}}`, value);
  });
  return result;
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
    ...(process.platform === "linux" ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false
    },
    kiosk: true
  });

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
    console.log("DEV MODE: Using primary display as external");
    return primary;
  }

  return external;
}

function createCustomerWindow(planScreeningId: number) {
  const externalDisplay = getExternalDisplay();

  if (customerWindow && !customerWindow.isDestroyed()) {
    customerWindow.focus();
    return;
  }

  customerWindow = new BrowserWindow({
    x: externalDisplay.bounds.x,
    y: externalDisplay.bounds.y,
    width: externalDisplay.bounds.width,
    height: externalDisplay.bounds.height,
    kiosk: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  });

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
    event.sender.send("customer:update-data", currentScreeningData);
    event.sender.send("customer:seat-sync", currentSeatState);
  });

  ipcMain.on("customer:update-data", (_, data) => {
    currentScreeningData = data;

    if (customerWindow && !customerWindow.isDestroyed()) {
      customerWindow.webContents.send("customer:update-data", data);
    }
  });

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

      return printService.enqueue(async () => {
        for (const ticket of tickets) {
          try {
            await printService.printSingleTicket(ticket, printerName);
          } catch (err) {
            console.error("Failed printing ticket:", err);
          }
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

  function getAppRootDir() {
    if (!app.isPackaged) {
      // Dev: dùng thư mục project
      return path.join(process.cwd(), "dev-data");
    }

    // Prod: thư mục cài app
    return path.dirname(app.getPath("exe"));
  }

  ipcMain.handle("get-default-export-folder", () => {
    const appRoot = getAppRootDir();

    const tempDir = path.join(appRoot, "temp");

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

  ipcMain.handle("export-ticket", async (_, payload) => {
    const templatePath = getTemplatePath();
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

    await renderTicketImage(html, outputPath);

    return outputPath;
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
