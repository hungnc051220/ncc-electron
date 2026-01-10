const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  openCustomerScreen: (planScreeningsId) =>
    ipcRenderer.send("open-customer-window", planScreeningsId),
  closeCustomerScreen: () => ipcRenderer.send("close-customer-window"),
  sendSeatUpdate: (data) => ipcRenderer.send("seat-update", data),
  onSeatUpdate: (callback) =>
    ipcRenderer.on("seat-update", (_, data) => callback(data)),
  sendQrDialogOpen: (data) => ipcRenderer.send("open-qr-dialog", data),
  sendQrDialogClose: () => ipcRenderer.send("close-qr-dialog"),
  onQrDialogOpen: (callback) =>
    ipcRenderer.on("open-qr-dialog", (_, data) => callback(data)),
  onQrDialogClose: (callback) =>
    ipcRenderer.on("close-qr-dialog", () => callback()),
  printTicket: (orderId, itemIndex, seatIndex) =>
    ipcRenderer.send("print-ticket", orderId, itemIndex, seatIndex),
  printTickets: (orderId, ticketsData) =>
    ipcRenderer.send("print-tickets", orderId, ticketsData),
  getDefaultExportFolder: () => ipcRenderer.invoke("get-default-export-folder"),
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  exportTicket: (payload) => ipcRenderer.invoke("export-ticket", payload),
  readFile: (path) =>
    ipcRenderer.invoke("read-file", path).then((buffer) => {
      // Chắc chắn trả về Uint8Array
      if (buffer instanceof Uint8Array) {
        return buffer;
      }
      // Hoặc chuyển đổi từ ArrayBuffer
      if (buffer instanceof ArrayBuffer) {
        return new Uint8Array(buffer);
      }
      // Fallback
      return new Uint8Array(buffer);
    }),
});
