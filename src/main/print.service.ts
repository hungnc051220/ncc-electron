import { app, BrowserWindow } from "electron";
import { readFileSync } from "fs";
import { join } from "path";
import { PrintTicketPayload } from "@shared/types";

export const createPrintService = () => {
  let printWindow: BrowserWindow | null = null;
  let printQueue: Promise<void> = Promise.resolve();

  function disposePrintWindow() {
    if (printWindow && !printWindow.isDestroyed()) {
      printWindow.destroy();
    }
    printWindow = null;
  }

  function isPrintCanceledError(error: unknown) {
    return (
      error instanceof Error &&
      typeof error.message === "string" &&
      error.message.toLowerCase().includes("canceled")
    );
  }

  // 🔹 Tạo hoặc reuse hidden window
  function getPrintWindow(): BrowserWindow {
    if (printWindow && !printWindow.isDestroyed()) {
      return printWindow;
    }

    printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        sandbox: true
      }
    });

    printWindow.on("closed", () => {
      printWindow = null;
    });

    return printWindow;
  }

  function getTicketTemplatePath() {
    return app.isPackaged
      ? join(process.resourcesPath, "ticket.html")
      : join(process.cwd(), "src/main/ticket.html");
  }

  // 🔹 Render HTML template từ file để dễ chỉnh layout
  function renderTicketHTML(ticket: PrintTicketPayload) {
    const template = readFileSync(getTicketTemplatePath(), "utf-8");
    const ticketData = JSON.stringify({
      ...ticket,
      paymentMethod: ticket.paymentMethod || ""
    });

    return template.replace(
      "window.__TICKET_DATA__ = window.__TICKET_DATA__ || null;",
      ["window.__TICKET_DATA__ = ", ticketData, ";"].join("")
    );
  }

  function enqueue(task: () => Promise<void>) {
    const taskPromise = printQueue.then(task);

    printQueue = taskPromise.catch((err) => {
      console.error("Print queue error:", err);
    });

    return taskPromise;
  }

  // 🔹 In 1 ticket (retry 1 lần)
  async function printSingleTicket(
    ticket: PrintTicketPayload,
    printerName?: string,
    retry = true
  ): Promise<void> {
    const win = getPrintWindow();
    const html = renderTicketHTML(ticket);

    await win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));

    await new Promise<void>((resolve, reject) => {
      win.webContents.print(
        {
          silent: true,
          deviceName: printerName,
          printBackground: true,
          margins: { marginType: "none" }
        },
        (success, error) => {
          if (!success) reject(new Error(error));
          else resolve();
        }
      );
    }).catch(async (err) => {
      disposePrintWindow();

      if (retry && !isPrintCanceledError(err)) {
        console.warn("Retry printing...");
        await printSingleTicket(ticket, printerName, false);
      } else {
        throw err;
      }
    });
  }

  return {
    enqueue,
    printSingleTicket
  };
};
