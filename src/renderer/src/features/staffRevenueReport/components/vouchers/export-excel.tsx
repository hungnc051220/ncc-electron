"use client";

import { VoucherUsageProps } from "@/types";
import { Button } from "antd";
import dayjs from "dayjs";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

type Props = {
  tableData: VoucherUsageProps[];
  total?: number;
  fromDate: string;
  toDate: string;
  employeeName?: string;
  fileName?: string;
};

const ExportRevenueExcelButton = ({
  tableData,
  fromDate,
  toDate,
  employeeName = "Tất cả",
  fileName = "bao-cao-so-luong-voucher.xlsx",
  total,
}: Props) => {
  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Chi tiết");

    const header = ["STT", "Mã voucher", "Số vé", "Ngày in"];
    const totalColumns = header.length;

    // ===== TITLE =====
    ws.addRow([]);
    ws.getCell(1, 1).value = "BẢNG BÁO CÁO SỐ LƯỢNG VOUCHER";
    ws.mergeCells(1, 1, 1, totalColumns);
    ws.getRow(1).font = { bold: true, size: 16 };
    ws.getRow(1).alignment = { horizontal: "center", vertical: "middle" };

    ws.addRow([]);
    ws.mergeCells(2, 1, 2, totalColumns);
    ws.getCell(2, 1).value = `Từ ngày: ${dayjs(fromDate).format(
      "DD/MM/YYYY",
    )} — Đến ngày: ${dayjs(toDate).format("DD/MM/YYYY")}`;
    ws.getRow(2).font = { italic: true };
    ws.getRow(2).alignment = { horizontal: "center" };

    ws.addRow([]);
    ws.mergeCells(3, 1, 3, totalColumns);
    ws.getCell(3, 1).value = `Nhân viên: ${employeeName}`;
    ws.getRow(3).font = { italic: true };
    ws.getRow(3).alignment = { horizontal: "center" };

    ws.addRow([]);

    // ===== HEADER =====
    const headerRow = ws.addRow(header);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    // ===== BODY =====
    tableData.forEach((r, index) => {
      ws.addRow([
        index + 1,
        r.voucherCode || "",
        r.numOrders || 0,
        r.printedOnUtcDateOnly
          ? dayjs(r.printedOnUtcDateOnly, "YYYY-MM-DD").format("DD/MM/YYYY")
          : "",
      ]);
    });

    // ===== SUMMARY =====
    const summaryRow = ws.addRow(["TỔNG CỘNG", "", total || 0, ""]);
    summaryRow.font = { bold: true };

    // merge label tổng cộng
    ws.mergeCells(summaryRow.number, 1, summaryRow.number, 2);
    summaryRow.getCell(1).alignment = {
      horizontal: "right",
      vertical: "middle",
    };
    summaryRow.getCell(3).alignment = { horizontal: "right" };

    // ===== COLUMN WIDTH =====
    ws.columns = [{ width: 8 }, { width: 30 }, { width: 18 }, { width: 18 }];

    // căn giữa STT + ngày
    ws.eachRow((row, rowNumber) => {
      if (rowNumber >= headerRow.number) {
        row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
        row.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
      }
    });

    // ===== BORDER TOÀN BỘ BẢNG =====
    const startRow = headerRow.number;
    const endRow = ws.lastRow!.number;
    const endCol = header.length;

    for (let r = startRow; r <= endRow; r++) {
      for (let c = 1; c <= endCol; c++) {
        ws.getCell(r, c).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        ws.getCell(r, c).alignment = {
          ...ws.getCell(r, c).alignment,
          vertical: "middle",
          wrapText: true,
        };
      }
    }

    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]), fileName);
  };

  return (
    <Button type="primary" onClick={exportExcel}>
      Xuất Excel
    </Button>
  );
};

export default ExportRevenueExcelButton;
