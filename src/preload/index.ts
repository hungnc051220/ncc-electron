import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";
import { PreloadAPI } from "./api.types";
import {
  AppTheme,
  CurrentSeatState,
  PlanScreeningDetailProps,
  QrState,
  UpdateInfo
} from "@shared/types";

// Custom APIs for renderer
const api: PreloadAPI = {
  openCustomerScreen: (id) => ipcRenderer.invoke("customer:open", id),
  closeCustomerScreen: () => ipcRenderer.invoke("customer:close"),
  requestCustomerInit: () => ipcRenderer.send("customer:request-init"),
  sendCustomerData: (data) => ipcRenderer.send("customer:update-data", data),
  onCustomerData: (cb) => {
    const handler = (_: unknown, data: PlanScreeningDetailProps) => cb(data);
    ipcRenderer.on("customer:update-data", handler);
    return () => ipcRenderer.removeListener("customer:update-data", handler);
  },

  sendSeatUpdate: (data) => ipcRenderer.send("booking:seat-update", data),
  onSeatSync: (cb) => {
    const handler = (_: unknown, data: CurrentSeatState) => cb(data);
    ipcRenderer.on("customer:seat-sync", handler);
    return () => ipcRenderer.removeListener("customer:seat-sync", handler);
  },

  sendQrOpen: (data) => ipcRenderer.send("qr:open", data),
  sendQrClose: () => ipcRenderer.send("qr:close"),
  onQrSync: (cb) => {
    const handler = (_: unknown, state: QrState) => cb(state);
    ipcRenderer.on("qr:sync", handler);
    return () => ipcRenderer.removeListener("qr:sync", handler);
  },
  printTickets: async (tickets, printerName) =>
    ipcRenderer.invoke("print-tickets", tickets, printerName),
  getDefaultExportFolder: () => ipcRenderer.invoke("get-default-export-folder"),
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  exportTicket: (payload) => ipcRenderer.invoke("export-ticket", payload),
  readFile: async (path) => {
    const buffer = await ipcRenderer.invoke("read-file", path);

    if (buffer instanceof Uint8Array) return buffer;
    if (buffer instanceof ArrayBuffer) return new Uint8Array(buffer);

    return new Uint8Array(buffer);
  },
  getVersion: (): Promise<string> => ipcRenderer.invoke("app:get-version"),
  checkUpdate: () => ipcRenderer.invoke("app:check-update"),
  startDownload: (): Promise<void> => ipcRenderer.invoke("app:start-download"),
  install: (): Promise<void> => ipcRenderer.invoke("app:install-update"),
  onAvailable: (cb) => {
    const handler = (_: unknown, info: UpdateInfo) => cb(info);
    ipcRenderer.on("update:available", handler);
    return () => ipcRenderer.removeListener("update:available", handler);
  },

  onProgress: (cb) => ipcRenderer.on("update:progress", (_, percent) => cb(percent)),
  onReady: (cb: () => void) => ipcRenderer.on("update:ready", cb),
  onError: (cb: (msg: string) => void) => ipcRenderer.on("update:error", (_, msg) => cb(msg)),
  getPrinters: () => ipcRenderer.invoke("get-printers"),
  sendThemeUpdate: (theme) => ipcRenderer.send("theme:update", theme),

  requestTheme: () => ipcRenderer.send("theme:request"),

  onThemeUpdate: (cb) => {
    const handler = (_: unknown, theme: AppTheme) => cb(theme);
    ipcRenderer.on("theme:update", handler);
    return () => ipcRenderer.removeListener("theme:update", handler);
  }
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
}
