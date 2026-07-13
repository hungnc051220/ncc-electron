import { saveExcelFile } from "@renderer/lib/saveFile";
import type { SaveFileResult } from "@renderer/lib/saveFile";
import { InvoiceProps, InvoiceStatus } from "@shared/types";
import dayjs from "dayjs";
import ExcelJS from "exceljs";
import { invoicesApi } from "@renderer/api/invoice.api";

const EXPORT_PAGE_SIZE = 100;

const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  [InvoiceStatus.NEW]: "Mới",
  [InvoiceStatus.PROCESSING]: "Đang xử lý",
  [InvoiceStatus.COMPLETED]: "Hoàn thành"
};

const headers = [
  "STT",
  "Thời gian tạo",
  "Mã đơn",
  "Tổng số tiền",
  "Mã số thuế",
  "Tên người mua/đơn vị",
  "Email",
  "Loại hóa đơn",
  "Mã vé",
  "Địa chỉ",
  "Số điện thoại",
  "Căn cước công dân",
  "Đại diện",
  "Chức vụ",
  "Hợp đồng số",
  "Ghi chú",
  "Thời gian sửa",
  "Trạng thái"
];

const toExcelDate = (value?: string) => {
  const parsed = dayjs(value);
  return value && parsed.isValid() ? parsed.toDate() : null;
};

const applyThinBorder = (
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number
) => {
  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = startCol; col <= endCol; col += 1) {
      worksheet.getCell(row, col).border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" }
      };
    }
  }
};

export const buildInvoicesWorkbook = (data: InvoiceProps[]) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Danh sách hóa đơn điện tử");

  worksheet.mergeCells(1, 1, 1, headers.length);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = "DANH SÁCH HÓA ĐƠN ĐIỆN TỬ";
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  const headerRowNumber = 3;
  const headerRow = worksheet.getRow(headerRowNumber);
  headerRow.values = headers;
  headerRow.height = 28;
  headerRow.font = { bold: true };
  headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

  data.forEach((invoice, index) => {
    worksheet.addRow([
      index + 1,
      toExcelDate(invoice.createdAt),
      invoice.order?.id ?? null,
      Number(invoice.order?.orderTotal || 0),
      invoice.taxCode || "",
      invoice.partyA || "",
      invoice.email || "",
      invoice.invoiceType === "personal" ? "Cá nhân" : "Đơn vị",
      invoice.order?.barCode || "",
      invoice.address || "",
      invoice.phoneNumber || "",
      invoice.citizenId || "",
      invoice.representative || "",
      invoice.position || "",
      invoice.contractCode || "",
      invoice.note || "",
      toExcelDate(invoice.updatedAt),
      invoiceStatusLabels[invoice.status] || invoice.status || ""
    ]);
  });

  const bodyStartRow = headerRowNumber + 1;
  const bodyEndRow = headerRowNumber + data.length;
  const summaryRow = worksheet.addRow([
    `Tổng ${data.length} hóa đơn`,
    "",
    "",
    {
      formula: data.length > 0 ? `SUM(D${bodyStartRow}:D${bodyEndRow})` : "0",
      result: data.reduce((total, invoice) => total + Number(invoice.order?.orderTotal || 0), 0)
    }
  ]);

  worksheet.mergeCells(summaryRow.number, 1, summaryRow.number, 3);
  summaryRow.font = { bold: true };
  summaryRow.height = 24;
  worksheet.getCell(summaryRow.number, 1).alignment = {
    horizontal: "center",
    vertical: "middle"
  };
  worksheet.getCell(summaryRow.number, 4).alignment = {
    horizontal: "right",
    vertical: "middle"
  };

  worksheet.columns = [
    { width: 8 },
    { width: 20 },
    { width: 12 },
    { width: 18 },
    { width: 18 },
    { width: 30 },
    { width: 30 },
    { width: 16 },
    { width: 20 },
    { width: 36 },
    { width: 18 },
    { width: 22 },
    { width: 24 },
    { width: 18 },
    { width: 18 },
    { width: 32 },
    { width: 20 },
    { width: 18 }
  ];

  for (let row = bodyStartRow; row <= summaryRow.number; row += 1) {
    [1, 2, 3, 8, 17, 18].forEach((column) => {
      worksheet.getCell(row, column).alignment = {
        horizontal: "center",
        vertical: "middle"
      };
    });
    [4].forEach((column) => {
      worksheet.getCell(row, column).alignment = {
        horizontal: "right",
        vertical: "middle"
      };
    });
    [6, 7, 9, 10, 12, 13, 14, 15, 16].forEach((column) => {
      worksheet.getCell(row, column).alignment = {
        horizontal: "left",
        vertical: "middle",
        wrapText: true
      };
    });
  }

  worksheet.getColumn(2).numFmt = "hh:mm dd/mm/yyyy";
  worksheet.getColumn(4).numFmt = '#,##0 "₫"';
  worksheet.getColumn(17).numFmt = "hh:mm dd/mm/yyyy";

  applyThinBorder(worksheet, headerRowNumber, summaryRow.number, 1, headers.length);

  worksheet.views = [
    {
      state: "frozen",
      ySplit: headerRowNumber
    }
  ];

  return workbook;
};

export const fetchAllInvoicesForExport = async (
  fetchPage: typeof invoicesApi.getAll = invoicesApi.getAll
) => {
  const allInvoices: InvoiceProps[] = [];
  let page = 1;
  let total = 0;

  do {
    const response = await fetchPage({ current: page, pageSize: EXPORT_PAGE_SIZE });
    allInvoices.push(...response.data);
    total = Number(response.total || 0);

    if (response.data.length < EXPORT_PAGE_SIZE) break;
    page += 1;
  } while (allInvoices.length < total);

  return allInvoices;
};

export const exportInvoicesExcel = async (data: InvoiceProps[]): Promise<SaveFileResult> => {
  const workbook = buildInvoicesWorkbook(data);
  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = "Danh sách hóa đơn điện tử.xlsx";

  return saveExcelFile(new Uint8Array(buffer), fileName);
};
