const {
  app,
  BrowserWindow,
  screen,
  ipcMain,
  utilityProcess,
} = require("electron/main");
const path = require("path");
const net = require("net");

let mainWindow;
let customerWindow;
let nextProcess;
let introWindow;

const isDev = !app.isPackaged;
const PORT = 3000;

if (require("electron-squirrel-startup")) app.quit();

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

function createWindow() {
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
