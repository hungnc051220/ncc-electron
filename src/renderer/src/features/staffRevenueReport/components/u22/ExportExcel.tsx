import { U22UsageProps } from "@shared/types";
import { Button } from "antd";
import dayjs from "dayjs";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

type Props = {
  tableData: U22UsageProps[];
  totalOrders?: number;
  fromDate: string;
  toDate: string;
  employeeName?: string;
  fileName?: string;
  totalAmount?: number;
};

const ExportRevenueExcelButton = ({
  tableData,
  fromDate,
  toDate,
  employeeName = "Tất cả",
  fileName = "bao-cao-giao-dich-mua-ve-u22.xlsx",
  totalOrders,
  totalAmount
}: Props) => {
  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Chi tiết");

    const header = ["STT", "Tên khách hàng", "Số thẻ", "Thời gian mua", "Số vé", "Thành tiền"];
    const totalColumns = header.length;

    // ===== TITLE =====
    ws.addRow([]);
    ws.getCell(1, 1).value = "BẢNG BÁO CÁO GIAO DỊCH MUA VÉ U22";
    ws.mergeCells(1, 1, 1, totalColumns);
    ws.getRow(1).font = { bold: true, size: 16 };
    ws.getRow(1).alignment = { horizontal: "center", vertical: "middle" };

    ws.addRow([]);
    ws.mergeCells(2, 1, 2, totalColumns);
    ws.getCell(2, 1).value = `Từ ngày: ${dayjs(fromDate).format(
      "DD/MM/YYYY"
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
    // ===== HEADER 2 TẦNG =====

    // Row 1 header
    const headerRow1 = ws.addRow([
      "STT",
      "Tên khách hàng",
      "Số thẻ",
      "Thời gian mua",
      "Mức chi tiêu",
      ""
    ]);

    // Row 2 header
    const headerRow2 = ws.addRow(["", "", "", "", "Số vé", "Thành tiền"]);

    // merge các cột đơn
    ws.mergeCells(headerRow1.number, 1, headerRow1.number + 1, 1); // STT
    ws.mergeCells(headerRow1.number, 2, headerRow1.number + 1, 2); // Tên
    ws.mergeCells(headerRow1.number, 3, headerRow1.number + 1, 3); // Số thẻ
    ws.mergeCells(headerRow1.number, 4, headerRow1.number + 1, 4); // Thời gian

    // merge "Mức chi tiêu"
    ws.mergeCells(headerRow1.number, 5, headerRow1.number, 6);

    // style header
    [headerRow1, headerRow2].forEach((row) => {
      row.eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });
    });

    // ===== BODY =====
    tableData.forEach((r, index) => {
      ws.addRow([
        index + 1,
        r.fullName || "",
        r.memberCardCode || "",
        r.paidDate ? dayjs(r.paidDate).format("HH:mm DD/MM/YYYY") : "",
        r.numOrders || 0,
        r.totalAmount || 0
      ]);
    });

    // ===== SUMMARY =====
    const summaryRow = ws.addRow(["TỔNG CỘNG", "", "", "", totalOrders || 0, totalAmount || 0]);
    summaryRow.font = { bold: true };

    // merge label tổng cộng
    ws.mergeCells(summaryRow.number, 1, summaryRow.number, 2);
    summaryRow.getCell(1).alignment = {
      horizontal: "right",
      vertical: "middle"
    };
    summaryRow.getCell(5).alignment = {
      horizontal: "right",
      vertical: "middle"
    };
    summaryRow.getCell(6).alignment = {
      horizontal: "right",
      vertical: "middle"
    };
    summaryRow.getCell(6).numFmt = '#,##0 "đ"';

    // ===== COLUMN WIDTH =====
    ws.columns = [
      { width: 8 }, // STT
      { width: 30 }, // Tên
      { width: 18 }, // Số thẻ
      { width: 20 }, // Thời gian
      { width: 18 }, // Số vé
      { width: 18 } // Thành tiền
    ];

    // căn giữa STT + ngày
    // ===== FORMAT CURRENCY (CỘT THÀNH TIỀN) =====
    ws.eachRow((row, rowNumber) => {
      if (rowNumber > headerRow2.number) {
        const moneyCell = row.getCell(6); // cột Thành tiền
        moneyCell.numFmt = '#,##0 "đ"';
        moneyCell.alignment = { horizontal: "right", vertical: "middle" };

        const qtyCell = row.getCell(5); // cột Số vé
        qtyCell.alignment = { horizontal: "right", vertical: "middle" };
      }
    });

    // ===== BORDER TOÀN BỘ BẢNG =====
    const startRow = headerRow1.number;
    const endRow = ws.lastRow!.number;
    const endCol = header.length;

    for (let r = startRow; r <= endRow; r++) {
      for (let c = 1; c <= endCol; c++) {
        ws.getCell(r, c).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" }
        };
        ws.getCell(r, c).alignment = {
          ...ws.getCell(r, c).alignment,
          vertical: "middle",
          wrapText: true
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
