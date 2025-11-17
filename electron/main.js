const { app, BrowserWindow, screen, ipcMain } = require("electron/main");
const path = require("path");
const { fork } = require("child_process");

const isDev = !app.isPackaged;

let mainWindow;
let customerWindow;
let nextServer;

const PORT = 3000;

// Khi build: chạy server Next từ standalone
function startNextServer() {
  const serverPath = path.join(__dirname, "../.next/standalone/server.js");

  console.log("Starting Next.js server...");

  nextServer = fork(serverPath, ["-p", PORT], {
    stdio: "inherit",
    env: { ...process.env, PORT },
  });

  nextServer.on("exit", () => {
    console.log("Next.js server stopped");
  });
}

const baseURL = `http://localhost:${PORT}`;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.removeMenu();
  mainWindow.maximize();
  mainWindow.loadURL(baseURL);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

function createCustomerWindow(planScreeningsId) {
  const displays = screen.getAllDisplays();

  const externalDisplay = displays.find(
    (d) => d.bounds.x !== 0 || d.bounds.y !== 0
  );

  if (!externalDisplay) return;

  if (customerWindow && !customerWindow.isDestroyed()) {
    if (customerWindow.isMinimized()) customerWindow.restore();
    customerWindow.focus();
    return;
  }

  customerWindow = new BrowserWindow({
    x: externalDisplay.bounds.x,
    y: externalDisplay.bounds.y,
    width: externalDisplay.bounds.width,
    height: externalDisplay.bounds.height,
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

app.whenReady().then(() => {
  if(!isDev){
    startNextServer();
  }

  createWindow();

  ipcMain.on("open-customer-window", (_, planCinemaId) => {
    createCustomerWindow(planCinemaId);
  });

  ipcMain.on("close-customer-window", () => {
    console.log("📩 Received: close-customer-window");
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

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("quit", () => {
  if (nextServer) nextServer.kill();
});
