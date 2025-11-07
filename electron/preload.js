const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  openCustomerScreen: (planScreeningsId) =>
    ipcRenderer.send("open-customer-window", planScreeningsId),
  closeCustomerScreen: () => ipcRenderer.send("close-customer-window"),
  sendSeatUpdate: (data) => ipcRenderer.send("seat-update", data),
  onSeatUpdate: (callback) =>
    ipcRenderer.on("seat-update", (_, data) => callback(data)),
});
