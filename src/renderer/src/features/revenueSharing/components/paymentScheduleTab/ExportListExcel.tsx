import { saveExcelFile } from "@renderer/lib/saveFile";
import dayjs from "dayjs";
import ExcelJS from "exceljs";
import type { SaveFileResult } from "@renderer/lib/saveFile";
import type { PaymentScheduleSummaryItem } from ".";

const moneyFormat = "#,##0";
const invalidFileNameChars = new Set(["<", ">", ":", '"', "/", "\\", "|", "?", "*"]);

const sanitizeFileName = (value: string) => {
  return Array.from(value)
    .map((char) => {
      const code = char.charCodeAt(0);
      if (invalidFileNameChars.has(char) || code < 32) {
        return " ";
      }

      return char;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
};

const applyThinBorder = (
  ws: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number
) => {
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      ws.getCell(row, col).border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" }
      };
    }
  }
};

type ExportPaymentScheduleListParams = {
  data: PaymentScheduleSummaryItem[];
  totalPaidAmount: number;
  fromDate?: string;
  toDate?: string;
};

export const exportPaymentScheduleListExcel = async ({
  data,
  totalPaidAmount,
  fromDate,
  toDate
}: ExportPaymentScheduleListParams): Promise<SaveFileResult> => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Payment Schedule");
  const totalColumns = 6;
  const hasDateRange =
    Boolean(fromDate) && Boolean(toDate) && dayjs(fromDate).isValid() && dayjs(toDate).isValid();
  const formattedFromDate = hasDateRange ? dayjs(fromDate) : null;
  const formattedToDate = hasDateRange ? dayjs(toDate) : null;
  const fileName = sanitizeFileName(
    hasDateRange
      ? `Tiến độ thanh toán ${formattedFromDate!.format("DD-MM-YYYY")}-${formattedToDate!.format("DD-MM-YYYY")}.xlsx`
      : "Tiến độ thanh toán.xlsx"
  );

  ws.mergeCells(1, 1, 1, totalColumns);
  ws.getCell(1, 1).value = "TIẾN ĐỘ THANH TOÁN";
  ws.getRow(1).font = { bold: true, size: 16 };
  ws.getRow(1).alignment = { horizontal: "center", vertical: "middle" };

  let headerRow = 3;

  if (hasDateRange) {
    ws.mergeCells(2, 1, 2, totalColumns);
    ws.getCell(2, 1).value =
      `Từ ngày ${formattedFromDate!.format("DD/MM/YYYY")} đến ngày ${formattedToDate!.format("DD/MM/YYYY")}`;
    ws.getRow(2).font = { italic: true };
    ws.getRow(2).alignment = { horizontal: "center", vertical: "middle" };
    headerRow = 4;
  }

  const headers = [
    "STT",
    "Hãng phim",
    "Tên phim",
    "Ngày phát hành",
    "Số lần thanh toán",
    "Tổng tiền đã thanh toán"
  ];

  headers.forEach((header, index) => {
    ws.getCell(headerRow, index + 1).value = header;
  });

  ws.getRow(headerRow).font = { bold: true };
  ws.getRow(headerRow).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true
  };
  ws.getRow(headerRow).height = 24;

  data.forEach((item, index) => {
    ws.addRow([
      index + 1,
      item.manufacturerName ?? item.manufacturerId,
      item.filmName ?? item.filmId,
      item.premieredDay && dayjs(item.premieredDay).isValid()
        ? dayjs(item.premieredDay).format("DD/MM/YYYY")
        : "",
      item.paymentCount,
      item.totalPaidAmount
    ]);
  });

  const bodyStartRow = headerRow + 1;
  const summaryRow = ws.addRow(["Tổng", "", "", "", "", totalPaidAmount]);
  const summaryRowNumber = summaryRow.number;
  const bodyEndRow = summaryRowNumber;

  ws.columns = [
    { width: 8 },
    { width: 28 },
    { width: 36 },
    { width: 16 },
    { width: 18 },
    { width: 24 }
  ];

  for (let row = bodyStartRow; row <= bodyEndRow; row++) {
    ws.getCell(row, 1).alignment = { horizontal: "center", vertical: "middle" };
    ws.getCell(row, 2).alignment = { horizontal: "left", vertical: "middle" };
    ws.getCell(row, 3).alignment = { horizontal: "left", vertical: "middle" };
    ws.getCell(row, 4).alignment = { horizontal: "center", vertical: "middle" };
    ws.getCell(row, 5).alignment = { horizontal: "right", vertical: "middle" };
    ws.getCell(row, 6).alignment = { horizontal: "right", vertical: "middle" };
    ws.getCell(row, 6).numFmt = moneyFormat;
  }

  ws.mergeCells(summaryRowNumber, 1, summaryRowNumber, 5);
  ws.getCell(summaryRowNumber, 1).font = { bold: true };
  ws.getCell(summaryRowNumber, 1).alignment = { horizontal: "center", vertical: "middle" };
  ws.getCell(summaryRowNumber, 6).font = { bold: true };
  ws.getCell(summaryRowNumber, 6).alignment = { horizontal: "right", vertical: "middle" };
  ws.getCell(summaryRowNumber, 6).numFmt = moneyFormat;

  applyThinBorder(ws, headerRow, bodyEndRow, 1, totalColumns);

  ws.views = [
    {
      state: "frozen",
      ySplit: headerRow,
      xSplit: 1
    }
  ];

  const buf = await wb.xlsx.writeBuffer();
  return saveExcelFile(new Uint8Array(buf), fileName);
};
