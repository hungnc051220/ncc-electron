import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";

export interface PreloadAPI {
  openCustomerScreen(id: number): void;
  closeCustomerScreen(): void;

  sendSeatUpdate(data: unknown): void;
  onSeatUpdate(cb: (data: unknown) => void): () => void;

  sendQrDialogOpen(data: unknown): void;
  sendQrDialogClose(): void;

  onQrDialogOpen(cb: (data: unknown) => void): () => void;
  onQrDialogClose(cb: () => void): () => void;

  printTicket(orderId: number, itemIndex: number, seatIndex: number): void;
  printTickets(orderId: number, ticketsData: unknown): void;

  getDefaultExportFolder(): Promise<string>;
  selectFolder(): Promise<string>;

  exportTicket(payload: unknown): Promise<void>;

  readFile(path: string): Promise<Uint8Array>;
}

// Custom APIs for renderer
const api: PreloadAPI = {
  openCustomerScreen: (id) => ipcRenderer.send("open-customer-window", id),

  closeCustomerScreen: () => ipcRenderer.send("close-customer-window"),

  sendSeatUpdate: (data) => ipcRenderer.send("seat-update", data),

  onSeatUpdate: (cb) => {
    const handler = (_: unknown, data: unknown) => cb(data);
    ipcRenderer.on("seat-update", handler);

    return () => ipcRenderer.removeListener("seat-update", handler);
  },

  sendQrDialogOpen: (data) => ipcRenderer.send("open-qr-dialog", data),

  sendQrDialogClose: () => ipcRenderer.send("close-qr-dialog"),

  onQrDialogOpen: (cb) => {
    const handler = (_: unknown, data: unknown) => cb(data);
    ipcRenderer.on("open-qr-dialog", handler);

    return () => ipcRenderer.removeListener("open-qr-dialog", handler);
  },

  onQrDialogClose: (cb) => {
    const handler = () => cb();
    ipcRenderer.on("close-qr-dialog", handler);

    return () => ipcRenderer.removeListener("close-qr-dialog", handler);
  },

  printTicket: (o, i, s) => ipcRenderer.send("print-ticket", o, i, s),

  printTickets: (o, d) => ipcRenderer.send("print-tickets", o, d),

  getDefaultExportFolder: () => ipcRenderer.invoke("get-default-export-folder"),

  selectFolder: () => ipcRenderer.invoke("select-folder"),

  exportTicket: (payload) => ipcRenderer.invoke("export-ticket", payload),

  readFile: async (path) => {
    const buffer = await ipcRenderer.invoke("read-file", path);

    if (buffer instanceof Uint8Array) return buffer;
    if (buffer instanceof ArrayBuffer) return new Uint8Array(buffer);

    return new Uint8Array(buffer);
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
