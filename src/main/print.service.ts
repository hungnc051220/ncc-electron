import { BrowserWindow } from "electron";
import { PrintTicketPayload } from "@shared/types";

const TICKET_WIDTH_MM = 80;
const TICKET_HEIGHT_MM = 100;
const MM_TO_MICRONS = 1000;

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

  // 🔹 Render HTML template inline để tránh phụ thuộc file ngoài khi build
  function renderTicketHTML(ticket: PrintTicketPayload) {
    const printedAt = new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(new Date());
    const floorText = ticket.floor
      ? String(ticket.floor).trim().toLowerCase().startsWith("tầng")
        ? String(ticket.floor).trim()
        : `Tầng ${String(ticket.floor).trim()}`
      : "";
    const paymentMethod = ticket.paymentMethod || "";
    const posName = ticket.posName || "";
    const staffName = ticket.staffName || "";
    const discountImage = ticket.discountImage
      ? `<img class="qr-side-image" src="${ticket.discountImage}" alt="discount" />`
      : "";

    return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <style>
      @page {
        size: ${TICKET_WIDTH_MM}mm ${TICKET_HEIGHT_MM}mm;
        margin: 0;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        width: ${TICKET_WIDTH_MM}mm;
        min-width: ${TICKET_WIDTH_MM}mm;
        font-family: Arial, Tahoma, sans-serif;
        font-size: 12px;
        color: #000;
        overflow: hidden;
      }

      body {
        display: flex;
        justify-content: center;
      }

      p {
        margin: 2px 0 0;
      }

      .ticket-shell {
        width: ${TICKET_WIDTH_MM}mm;
        padding: 1.5mm;
      }

      .ticket {
        width: 100%;
        font-family: Arial, Tahoma, sans-serif;
        padding: 0;
      }

      .center {
        text-align: center;
      }

      .bold {
        font-weight: 600;
      }

      .title {
        font-size: 13px;
        font-weight: 600;
        text-transform: uppercase;
      }

      .ticket-title {
        font-size: 15px;
        font-weight: 600;
        text-transform: uppercase;
        margin-top: 8px;
        text-align: center;
      }

      .sub {
        font-size: 9px;
        margin-top: 1px;
      }

      .info-wrapper {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 4px 8px;
        margin-top: 10px;
        width: 100%;
      }

      .row {
        display: flex;
        align-items: flex-start;
        min-width: 0;
        line-height: 1.02;
      }

      .row > div {
        min-width: 50px;
      }

      .label {
        font-size: 12px;
        font-weight: 600;
        line-height: 1;
      }

      .label-footer {
        font-size: 10px;
        font-weight: 600;
      }

      .en-label {
        font-size: 9px;
        line-height: 1;
      }

      .value {
        font-size: 13px;
        font-weight: 600;
        word-break: break-word;
        overflow-wrap: anywhere;
      }

      .movie {
        text-align: center;
        text-transform: uppercase;
        margin-top: 3px;
        word-break: break-word;
        line-height: 1.05;
      }

      .qr {
        margin-top: 4px;
      }

      .qr-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        column-gap: 8px;
        justify-content: center;
        align-items: start;
        margin-top: 4px;
      }

      .qr-side {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        min-width: 96px;
      }

      .qr-side-image {
        width: 74px;
        height: 74px;
        object-fit: contain;
        display: block;
      }

      .qr-main {
        display: flex;
        align-items: flex-start;
        justify-content: center;
        width: 100px;
      }

      .ticket-code {
        margin-top: 4px;
        font-size: 11px;
        font-weight: 600;
        line-height: 1.1;
        width: 100%;
        text-align: center;
        white-space: nowrap;
      }

      .footer {
        text-align: center;
        font-size: 10px;
        margin-top: 4px;
      }

      .flex-center {
        display: flex;
        justify-content: center;
        align-items: center;
      }

      @media print {
        html,
        body {
          margin: 0;
          width: ${TICKET_WIDTH_MM}mm;
          min-width: ${TICKET_WIDTH_MM}mm;
        }
      }
    </style>
  </head>
  <body>
    <div class="ticket-shell">
      <div class="ticket">
        <div class="center">
          <div class="title">${ticket.cinemaName}</div>
          <div>NATIONAL CINEMA CENTER</div>
          <div class="sub">${ticket.address}</div>
        </div>

        <div class="ticket-title">VÉ XEM PHIM (TICKET)</div>

        <div class="movie">${ticket.movieName}</div>

        <div class="info-wrapper">
          <div class="row">
            <div>
              <span class="label">Giờ:</span>
              <p class="en-label">Time:</p>
            </div>
            <span class="value">${ticket.showTime}</span>
          </div>

          <div class="row">
            <div>
              <span class="label">Ghế:</span>
              <p class="en-label">Seat:</p>
            </div>
            <span class="value">${ticket.seat}</span>
          </div>

          <div class="row">
            <div>
              <span class="label">Ngày:</span>
              <p class="en-label">Date:</p>
            </div>
            <span class="value">${ticket.date}</span>
          </div>

          <div class="row">
            <div>
              <span class="label">Phòng:</span>
              <p class="en-label">Room:</p>
            </div>
            <span class="value">${ticket.room}</span>
          </div>

          <div class="row">
            <div>
              <span class="label">Giá vé:</span>
              <p class="en-label">Price:</p>
            </div>
            <span class="value">${ticket.price}</span>
          </div>

          <div class="value">${floorText}</div>
        </div>

        <div class="qr qr-grid">
          <div class="qr-side">
            ${discountImage}
            <div class="ticket-code">Mã vé: ${ticket.ticketCode}</div>
          </div>
          <div class="qr-main">
            <img src="${ticket.qrData}" alt="qr" width="100" height="100" />
          </div>
        </div>

        <div class="footer">www.chieuphimquocgia.com.vn</div>
        <div class="info-wrapper">
          <div class="row">
            <span class="en-label">Máy bán:</span>
            <span class="label-footer">${posName}</span>
          </div>
          <div class="row">
            <span class="en-label">Hình thức TT:</span>
            <span class="label-footer">${paymentMethod}</span>
          </div>
          <div class="row">
            <span class="en-label">Nhân viên:</span>
            <span class="label-footer">${staffName}</span>
          </div>
          <div class="row">
            <span class="en-label">In lúc:</span>
            <span class="label-footer">${printedAt}</span>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;
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
    await win.webContents.executeJavaScript(`
      Promise.all(
        Array.from(document.images).map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            const done = () => resolve();
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
          });
        })
      )
    `);

    await new Promise<void>((resolve, reject) => {
      win.webContents.print(
        {
          silent: true,
          deviceName: printerName,
          printBackground: true,
          margins: { marginType: "none" },
          pageSize: {
            width: TICKET_WIDTH_MM * MM_TO_MICRONS,
            height: TICKET_HEIGHT_MM * MM_TO_MICRONS
          }
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
