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
});
