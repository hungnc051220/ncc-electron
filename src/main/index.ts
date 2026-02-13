import { app, shell, BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { autoUpdater } from "electron-updater";
import icon from "../../resources/icon.png?asset";

let mainWindow: BrowserWindow | null = null;

function setupUpdater(win: BrowserWindow) {
  const isDev = !app.isPackaged;

  // ✅ IPC luôn tồn tại
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

  // ❌ Dev mode không chạy updater thật
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

function createWindow(): void {
  // Create the browser window.
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

  // IPC test
  ipcMain.on("ping", () => console.log("pong"));

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
