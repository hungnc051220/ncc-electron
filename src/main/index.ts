import { app, shell, BrowserWindow, ipcMain, dialog } from "electron";
import path, { join } from "path";
import fs from "node:fs";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { autoUpdater } from "electron-updater";
import icon from "../../resources/icon.png?asset";

const baseURL = import.meta.env.VITE_API_BASE_URL;

let mainWindow: BrowserWindow | null = null;
let printWindow: BrowserWindow | null = null;

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

  console.log("Actual size:", actualSize);

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

  console.log("Image size:", image.getSize());

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

  const printSingleTicket = (orderId, itemIndex, seatIndex) => {
    return new Promise((resolve, reject) => {
      if (printWindow && !printWindow.isDestroyed()) {
        printWindow.close();
      }

      printWindow = new BrowserWindow({
        show: false, // ⚠️ BẮT BUỘC
        width: 300,
        height: 600,
        webPreferences: {
          devTools: true
        }
      });

      printWindow.on("closed", () => {
        printWindow = null;
      });

      let isResolved = false;

      printWindow.webContents.on("did-fail-load", (_e, code, desc, url) => {
        console.error("did-fail-load", { code, desc, url });
        if (!isResolved) {
          isResolved = true;
          reject(new Error(`Failed to load: ${desc}`));
        }
      });

      printWindow.webContents.on("dom-ready", () => {
        setTimeout(() => {
          printWindow?.webContents.print(
            {
              silent: true,
              deviceName: "EPSON TM-T81III Receipt",
              printBackground: true,
              margins: { marginType: "none" }
            },
            (success, error) => {
              if (!isResolved) {
                isResolved = true;
                if (success) {
                  console.log(
                    `PRINT RESULT: Success for order ${orderId}, item ${itemIndex}, seat ${seatIndex}`
                  );
                  // resolve();
                } else {
                  console.error(
                    `PRINT RESULT: Error for order ${orderId}, item ${itemIndex}, seat ${seatIndex}`,
                    error
                  );
                  reject(error);
                }
              }
              // Đóng window sau một chút để đảm bảo print hoàn tất
              setTimeout(() => {
                printWindow?.close();
              }, 100);
            }
          );
        }, 1000); // ⚠️ đừng giảm
      });

      // Build URL with query params
      const url = new URL(`${baseURL}/print-ticket/${orderId}`);
      if (itemIndex !== undefined) {
        url.searchParams.set("itemIndex", itemIndex.toString());
      }
      if (seatIndex !== undefined) {
        url.searchParams.set("seatIndex", seatIndex.toString());
      }

      printWindow.loadURL(url.toString()).catch((err) => {
        if (!isResolved) {
          isResolved = true;
          reject(err);
        }
      });
    });
  };

  ipcMain.on("print-ticket", async (_, orderId, itemIndex, seatIndex) => {
    // Nếu có orderId, in vé cụ thể
    if (orderId !== undefined && orderId !== null) {
      try {
        await printSingleTicket(orderId, itemIndex, seatIndex);
      } catch (error) {
        console.error("Print ticket error:", error);
      }
      return;
    }

    // Fallback: print ticket không có params (backward compatibility)
    try {
      await printSingleTicket(undefined, undefined, undefined);
    } catch (error) {
      console.error("Print ticket error:", error);
    }
  });

  ipcMain.on("print-tickets", async (_, orderId, ticketsData) => {
    // ticketsData là array của { itemIndex, seatIndex } để in
    // Nếu không có ticketsData, sẽ lấy từ API (fallback)
    try {
      let ticketsToPrint = ticketsData;

      // Nếu không có ticketsData, lấy từ API
      if (!ticketsToPrint || ticketsToPrint.length === 0) {
        const response = await fetch(`${baseURL}/api/order-items/${orderId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch order items: ${response.statusText}`);
        }
        const orderData = await response.json();

        // Tạo danh sách vé cần in
        ticketsToPrint = [];
        for (let itemIndex = 0; itemIndex < orderData.items.length; itemIndex++) {
          const item = orderData.items[itemIndex];

          // Tách từng ghế từ listChairValueF1, F2, F3
          const getSeatsList = (item) => {
            const seatsF1 = item.listChairValueF1
              ? item.listChairValueF1
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              : [];
            const seatsF2 = item.listChairValueF2
              ? item.listChairValueF2
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              : [];
            const seatsF3 = item.listChairValueF3
              ? item.listChairValueF3
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              : [];
            return [...seatsF1, ...seatsF2, ...seatsF3];
          };

          const seatsList = getSeatsList(item);

          // Thêm từng ghế vào danh sách
          for (let seatIndex = 0; seatIndex < seatsList.length; seatIndex++) {
            ticketsToPrint.push({ itemIndex, seatIndex });
          }
        }
      }

      // In từng vé
      for (const ticket of ticketsToPrint) {
        try {
          await printSingleTicket(orderId, ticket.itemIndex, ticket.seatIndex);
          // Delay giữa các lần in để tránh conflict
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Error printing ticket ${ticket.itemIndex}-${ticket.seatIndex}:`, error);
          // Tiếp tục in các vé khác dù có lỗi
        }
      }
    } catch (error) {
      console.error("Print tickets error:", error);
    }
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

  ipcMain.handle("export-ticket", async (_, payload) => {
    const templatePath = path.join(__dirname, "ticket-template.html");
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
    console.log("output Path", outputPath);

    await renderTicketImage(html, outputPath);

    return outputPath;
  });

  ipcMain.handle("read-file", async (_, filePath) => {
    const data = await fs.promises.readFile(filePath);
    return new Uint8Array(data.buffer);
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
