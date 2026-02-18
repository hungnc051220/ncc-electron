import { BrowserWindow } from "electron";

export const createPrintService = () => {
  let printWindow: BrowserWindow | null = null;
  let printQueue: Promise<void> = Promise.resolve();

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

  // 🔹 Render HTML template
  function renderTicketHTML(ticket: any) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <style>
        body {
          font-family: monospace;
          width: 80mm;
          margin: 0;
          padding: 5px;
        }
        .center { text-align: center; }
        .bold { font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="center bold">${ticket.cinemaName}</div>
      <div>Phim: ${ticket.movieName}</div>
      <div>Suất: ${ticket.showTime}</div>
      <div>Phòng: ${ticket.room}</div>
      <div>Ghế: ${ticket.seat}</div>
      <div>Mã vé: ${ticket.ticketCode}</div>
    </body>
    </html>
  `;
  }

  function enqueue(task: () => Promise<void>) {
    printQueue = printQueue.then(task).catch((err) => {
      console.error("Print queue error:", err);
      throw err;
    });

    return printQueue;
  }

  // 🔹 In 1 ticket (retry 1 lần)
  async function printSingleTicket(ticket: any, printerName?: string, retry = true): Promise<void> {
    const win = getPrintWindow();
    const html = renderTicketHTML(ticket);

    await win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));

    await new Promise<void>((resolve, reject) => {
      win.webContents.once("did-finish-load", () => {
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
      });
    }).catch(async (err) => {
      if (retry) {
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
