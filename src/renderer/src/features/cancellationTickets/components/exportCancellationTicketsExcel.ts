import { saveExcelFile } from "@renderer/lib/saveFile";
import type { SaveFileResult } from "@renderer/lib/saveFile";
import { CancellationTicketProps } from "@shared/types";
import dayjs from "dayjs";
import ExcelJS from "exceljs";

const invalidFileNameChars = new Set(["<", ">", ":", '"', "/", "\\", "|", "?", "*"]);

type ExportCancellationTicketsExcelParams = {
  data: CancellationTicketProps[];
  fromDate?: string;
  toDate?: string;
};

const sanitizeFileName = (value: string) =>
  Array.from(value)
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

const applyThinBorder = (
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number
) => {
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      worksheet.getCell(row, col).border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" }
      };
    }
  }
};

const formatSeatValues = (record: CancellationTicketProps) =>
  [record.cancelChairValueF1, record.cancelChairValueF2, record.cancelChairValueF3]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(", ");

export const exportCancellationTicketsExcel = async ({
  data,
  fromDate,
  toDate
}: ExportCancellationTicketsExcelParams): Promise<SaveFileResult> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Quan ly huy ve");
  const totalColumns = 11;
  const hasDateRange =
    Boolean(fromDate) && Boolean(toDate) && dayjs(fromDate).isValid() && dayjs(toDate).isValid();
  const formattedFromDate = hasDateRange ? dayjs(fromDate) : null;
  const formattedToDate = hasDateRange ? dayjs(toDate) : null;
  const fileName = sanitizeFileName(
    hasDateRange
      ? `Quản lý hủy vé ${formattedFromDate!.format("DD-MM-YYYY")}-${formattedToDate!.format("DD-MM-YYYY")}.xlsx`
      : "Quản lý hủy vé.xlsx"
  );

  worksheet.mergeCells(1, 1, 1, totalColumns);
  worksheet.getCell(1, 1).value = "QUẢN LÝ HỦY VÉ";
  worksheet.getRow(1).font = { bold: true, size: 16 };
  worksheet.getRow(1).alignment = { horizontal: "center", vertical: "middle" };

  let headerRow = 3;

  if (hasDateRange) {
    worksheet.mergeCells(2, 1, 2, totalColumns);
    worksheet.getCell(2, 1).value =
      `Từ ngày ${formattedFromDate!.format("DD/MM/YYYY")} đến ngày ${formattedToDate!.format("DD/MM/YYYY")}`;
    worksheet.getRow(2).font = { italic: true };
    worksheet.getRow(2).alignment = { horizontal: "center", vertical: "middle" };
    headerRow = 4;
  }

  const headers = [
    "STT",
    "Mã đơn huỷ",
    "Thời gian hủy",
    "Phim",
    "Phòng",
    "Ngày chiếu",
    "Giờ chiếu",
    "Số vé",
    "Vị trí ghế",
    "Người hủy",
    "Lý do hủy"
  ];

  headers.forEach((header, index) => {
    worksheet.getCell(headerRow, index + 1).value = header;
  });

  worksheet.getRow(headerRow).font = { bold: true };
  worksheet.getRow(headerRow).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true
  };
  worksheet.getRow(headerRow).height = 24;

  data.forEach((item, index) => {
    worksheet.addRow([
      index + 1,
      item.order?.id ?? "",
      item.createdOnUtc ? dayjs(item.createdOnUtc).format("HH:mm DD/MM/YYYY") : "",
      item.filmName ?? "",
      item.roomName ?? "",
      item.projectDate ? dayjs(item.projectDate, "YYYY-MM-DD").format("DD/MM/YYYY") : "",
      item.projectTime ? dayjs(item.projectTime).format("HH:mm") : "",
      Number(item.quantity || 0),
      formatSeatValues(item),
      item.userName ?? "",
      item.reason ?? ""
    ]);
  });

  const bodyStartRow = headerRow + 1;
  const summaryRow = worksheet.addRow([
    `Tổng ${data.length} đơn huỷ`,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    data.reduce((total, item) => total + Number(item.quantity || 0), 0),
    "",
    "",
    ""
  ]);
  const summaryRowNumber = summaryRow.number;

  worksheet.columns = [
    { width: 8 },
    { width: 12 },
    { width: 20 },
    { width: 32 },
    { width: 16 },
    { width: 14 },
    { width: 12 },
    { width: 10 },
    { width: 26 },
    { width: 20 },
    { width: 36 }
  ];

  for (let row = bodyStartRow; row <= summaryRowNumber; row++) {
    worksheet.getCell(row, 1).alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getCell(row, 2).alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getCell(row, 3).alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getCell(row, 4).alignment = { horizontal: "left", vertical: "middle" };
    worksheet.getCell(row, 5).alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getCell(row, 6).alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getCell(row, 7).alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getCell(row, 8).alignment = { horizontal: "right", vertical: "middle" };
    worksheet.getCell(row, 9).alignment = {
      horizontal: "left",
      vertical: "middle",
      wrapText: true
    };
    worksheet.getCell(row, 10).alignment = { horizontal: "left", vertical: "middle" };
    worksheet.getCell(row, 11).alignment = {
      horizontal: "left",
      vertical: "middle",
      wrapText: true
    };
  }

  worksheet.mergeCells(summaryRowNumber, 1, summaryRowNumber, 7);
  worksheet.getCell(summaryRowNumber, 1).font = { bold: true };
  worksheet.getCell(summaryRowNumber, 1).alignment = {
    horizontal: "center",
    vertical: "middle"
  };
  worksheet.getCell(summaryRowNumber, 8).font = { bold: true };
  worksheet.getCell(summaryRowNumber, 8).alignment = {
    horizontal: "right",
    vertical: "middle"
  };

  applyThinBorder(worksheet, headerRow, summaryRowNumber, 1, totalColumns);

  worksheet.views = [
    {
      state: "frozen",
      ySplit: headerRow,
      xSplit: 1
    }
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return saveExcelFile(new Uint8Array(buffer), fileName);
};
