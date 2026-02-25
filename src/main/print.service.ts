import { BrowserWindow } from "electron";
import { PrintTicketPayload } from "@shared/types";

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
  function renderTicketHTML(ticket: PrintTicketPayload) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 0;
            font-family: Arial, Tahoma, sans-serif;
            font-size: 12px;
            color: #000;
          }

          .ticket {
            width: 80mm;
            padding: 8px 16px;
          }

          .center {
            text-align: center;
          }

          .bold {
            font-weight: 700;
          }

          .title {
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
          }

          .ticket-title {
            font-size: 16px;
            font-weight: 700;
            text-transform: uppercase;
            margin-top: 10px;
            text-align: center;
          }

          .sub {
            font-size: 11px;
            margin-top: 2px;
          }

          .info-wrapper {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 4px 16px;
            margin-top: 8px;
          }

          .row {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .label {
            font-size: 12px;
            font-weight: 600;
          }

          .label-footer {
            font-size: 11px;
            font-weight: 600;
          }

          .en-label {
            font-size: 10px;
          }

          .value {
            font-size: 14px;
            font-weight: 600;
          }

          .movie {
            text-align: center;
            text-transform: uppercase;
          }

          .qr {
            text-align: center;
            margin-top: 8px;
          }

          .qr img {
            margin-left: auto;
            margin-right: auto;
          }

          .footer {
            text-align: center;
            font-size: 10px;
            margin-top: 6px;
          }

          .flex-center {
            display: flex;
            justify-content: center;
            align-items: center;
          }

          @media print {
            body {
              margin: 0;
            }
          }
        </style>
    </head>
    <body>
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
            <span class="value">
              ${ticket.showTime}
            </span>
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
            <span class="value">
              ${ticket.date}
            </span>
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

          <div class="center value flex-center">
            Tầng ${ticket.floor}
          </div>

          <div class="bold flex-center value">
            Mã vé: ${ticket.ticketCode}
          </div>

          <div class="qr">
            <img
              src=${ticket.qrData}
              alt="qr"
              width="100"
              height="100"
            />
          </div>
        </div>

        <div class="footer">www.chieuphimquocgia.com.vn</div>
        <div class="info-wrapper">
          <div class="row">
            <span class="en-label">Máy bán:</span>
            <span class="label-footer">M4-202112</span>
          </div>
          <div class="row">
            <span class="bold"></span>
            <span class="bold"></span>
          </div>
          <div class="row">
            <span class="en-label">Nhân viên:</span>
            <span class="label-footer">Hưng</span>
          </div>
          <div class="row">
            <span class="en-label">Hotline:</span>
            <span class="label-footer">024.35141791</span>
          </div>
        </div>
      </div>
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
  async function printSingleTicket(
    ticket: PrintTicketPayload,
    printerName?: string,
    retry = true
  ): Promise<void> {
    const win = getPrintWindow();
    const html = renderTicketHTML(ticket);

    await win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));

    await new Promise<void>((resolve, reject) => {
      win.webContents.openDevTools();
      win.webContents.print(
        {
          silent: true,
          deviceName: undefined,
          printBackground: true,
          margins: { marginType: "none" }
        },
        (success, error) => {
          if (!success) reject(new Error(error));
          else resolve();
        }
      );
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
