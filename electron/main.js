const {
  app,
  BrowserWindow,
  screen,
  ipcMain,
  utilityProcess,
} = require("electron/main");
const fs = require("fs");
const path = require("path");
const net = require("net");
const { dialog } = require("electron");

let mainWindow;
let customerWindow;
let nextProcess;
let introWindow;
let printWindow;

const isDev = !app.isPackaged;
const PORT = 3000;

if (require("electron-squirrel-startup")) app.quit();

function renderTemplate(html, data) {
  let result = html;
  Object.entries(data).forEach(([key, value]) => {
    result = result.replaceAll(`{{${key}}}`, value);
  });
  return result;
}

const WIDTH = 2363;
const HEIGHT = 1064;

async function renderTicketImage(htmlContent, outputPath) {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    useContentSize: true,
    webPreferences: {
      offscreen: true,
    },
  });

  await win.loadURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(htmlContent)
  );

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
    height: actualSize.height,
  });

  console.log("Image size:", image.getSize());

  fs.writeFileSync(outputPath, image.toPNG());

  win.destroy();
}

function createIntroWindow() {
  introWindow = new BrowserWindow({
    width: 800,
    height: 450,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    resizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  introWindow.loadFile(path.join(__dirname, "public/intro.html"));
  introWindow.once("ready-to-show", () => introWindow.show());
}

// ---------------- WAIT FOR PORT (SAFE START) ----------------
function waitForPort(port) {
  return new Promise((resolve) => {
    const timer = setInterval(() => {
      const client = net.createConnection({ port }, () => {
        clearInterval(timer);
        client.end();
        resolve();
      });

      client.on("error", () => {});
    }, 200);
  });
}

// ---------------- START NEXT.JS SERVER ----------------
async function startNextServer() {
  return new Promise((resolve, reject) => {
    if (isDev) return resolve();

    const serverPath = path.join(
      process.resourcesPath,
      ".next",
      "standalone",
      "server.js"
    );

    console.log("➡ Starting Next.js server:", serverPath);
    console.log("➡ Resource Path:", process.resourcesPath);

    nextProcess = utilityProcess.fork(serverPath, [], {
      env: {
        ...process.env,
        PORT: `${PORT}`,
        HOSTNAME: "localhost",
      },
      cwd: path.join(process.resourcesPath, ".next", "standalone"),
    });

    nextProcess.on("exit", (code) => {
      console.error("❌ Next.js exited with code", code);
      reject(new Error("Next.js crashed."));
    });

    // Wait until Next.js actually starts
    waitForPort(PORT).then(resolve);
  });
}

// ---------------- CREATE MAIN WINDOW ----------------
const baseURL = `http://localhost:${PORT}`;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    fullScreen: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.removeMenu();
  mainWindow.loadURL(baseURL);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  try {
    const printers = await mainWindow.webContents.getPrintersAsync();
    console.log("Available printers:", printers);
    // You can now use the printer list, e.g., to find the default printer
    const defaultPrinter = printers.find((p) => p.isDefault);
    if (defaultPrinter) {
      console.log("Default printer name:", defaultPrinter.displayName);
    }
  } catch (error) {
    console.error("Error fetching printers:", error);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;

    if (customerWindow) {
      customerWindow.close();
    }
  });
}

// ---------------- SECOND SCREEN WINDOW ----------------
function createCustomerWindow(planScreeningsId) {
  const displays = screen.getAllDisplays();
  const external = displays.find((d) => d.bounds.x !== 0 || d.bounds.y !== 0);

  if (!external) return;

  if (customerWindow && !customerWindow.isDestroyed()) {
    if (customerWindow.isMinimized()) customerWindow.restore();
    customerWindow.focus();
    return;
  }

  customerWindow = new BrowserWindow({
    x: external.bounds.x,
    y: external.bounds.y,
    width: external.bounds.width,
    height: external.bounds.height,
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  customerWindow.removeMenu();
  customerWindow.loadURL(
    `${baseURL}/plan-screening/${planScreeningsId}?view=customer`
  );

  customerWindow.on("closed", () => {
    console.log("Customer window closed");
    customerWindow = null;
  });
}

// ---------------- APP INIT ----------------
app.whenReady().then(async () => {
  await startNextServer();

  createIntroWindow();

  ipcMain.on("intro-finished", () => {
    introWindow.close();
    createWindow();
  });

  ipcMain.on("open-customer-window", (_, id) => {
    createCustomerWindow(id);
  });

  ipcMain.on("close-customer-window", () => {
    if (customerWindow && !customerWindow.isDestroyed()) {
      customerWindow.close();
      customerWindow = null;
    }
  });

  ipcMain.on("seat-update", (_, data) => {
    if (customerWindow) {
      customerWindow.webContents.send("seat-update", data);
    }
  });

  ipcMain.on("open-qr-dialog", (_, data) => {
    if (customerWindow && !customerWindow.isDestroyed()) {
      customerWindow.webContents.send("open-qr-dialog", data);
    }
  });

  ipcMain.on("close-qr-dialog", () => {
    if (customerWindow && !customerWindow.isDestroyed()) {
      customerWindow.webContents.send("close-qr-dialog");
    }
  });

  // Helper function để in một vé
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
          devTools: true,
        },
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
          printWindow.webContents.print(
            {
              silent: true,
              deviceName: "EPSON TM-T81III Receipt",
              printBackground: true,
              margins: { marginType: "none" },
            },
            (success, error) => {
              if (!isResolved) {
                isResolved = true;
                if (success) {
                  console.log(
                    `PRINT RESULT: Success for order ${orderId}, item ${itemIndex}, seat ${seatIndex}`
                  );
                  resolve();
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
          throw new Error(
            `Failed to fetch order items: ${response.statusText}`
          );
        }
        const orderData = await response.json();

        // Tạo danh sách vé cần in
        ticketsToPrint = [];
        for (
          let itemIndex = 0;
          itemIndex < orderData.items.length;
          itemIndex++
        ) {
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
          console.error(
            `Error printing ticket ${ticket.itemIndex}-${ticket.seatIndex}:`,
            error
          );
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
      properties: ["openDirectory"],
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
      floor: payload.floor,
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

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// ---------------- CLEANUP ----------------
app.on("window-all-closed", () => {
  if (nextProcess) nextProcess.kill();

  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (nextProcess) nextProcess.kill();
});
