"use client";

import { Button } from "antd";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import dayjs from "dayjs";

type Row = {
  filmName: string;
  projectDate: string;
  projectTime: string;
  roomName: string;
  isOnline: boolean;
  pricesMap: Record<number, number>;
  filmRowSpan?: number;
  dateRowSpan?: number;
  onlineRowSpan?: number;
  totalInvitationQuantity: number;
  totalContractQuantity: number;
  totalQuantity: number;
  totalSale: number;
  saleVnPayQr: number;
  saleVietQr: number;
  actualSale: number;
};

type SummaryGroup = {
  off: Row[];
  on: Row[];
};

type Props = {
  tableData: Row[];
  allPrices: number[];
  summaryByDate: Record<string, SummaryGroup>;

  fromDate: string;
  toDate: string;
  employeeName?: string;

  fileName?: string;
};

const ExportRevenueExcelButton = ({
  tableData,
  allPrices,
  summaryByDate,
  fromDate,
  toDate,
  employeeName = "Tất cả",
  fileName = "bao-cao-doanh-thu-phim.xlsx"
}: Props) => {
  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Doanh thu theo phim");

    const header = [
      "Phim",
      "Ngày",
      "Giờ",
      "Phòng",
      "Loại",
      ...allPrices.map((p) => (p / 1000).toString()),
      "Tổng",
      "Giấy mời",
      "Hợp đồng",
      "Thành tiền",
      "VNPayQR",
      "VietQR",
      "Thực nộp"
    ];

    const totalColumns = header.length;

    // ===== TITLE =====
    ws.addRow([]);
    ws.getCell(1, 1).value = "BẢNG THỐNG KÊ DOANH THU PHIM THEO NHÂN VIÊN";
    ws.mergeCells(1, 1, 1, totalColumns);
    ws.getRow(1).font = { bold: true, size: 16 };
    ws.getRow(1).alignment = { horizontal: "center" };

    ws.addRow([]);
    ws.mergeCells(ws.lastRow!.number, 1, ws.lastRow!.number, totalColumns);

    ws.getCell(ws.lastRow!.number, 1).value =
      `Từ ngày: ${dayjs(fromDate).format("DD/MM/YYYY")}  —  Đến ngày: ${dayjs(toDate).format("DD/MM/YYYY")}`;

    ws.getRow(ws.lastRow!.number).alignment = {
      horizontal: "center",
      vertical: "middle"
    };
    ws.getRow(ws.lastRow!.number).font = { italic: true };

    ws.addRow([]);
    ws.mergeCells(ws.lastRow!.number, 1, ws.lastRow!.number, totalColumns);

    ws.getCell(ws.lastRow!.number, 1).value = `Nhân viên: ${employeeName}`;
    ws.getRow(ws.lastRow!.number).alignment = {
      horizontal: "center",
      vertical: "middle"
    };
    ws.getRow(ws.lastRow!.number).font = { italic: true };

    ws.addRow([]);

    // ===== HEADER GROUP ROW =====
    const headerGroupRowIndex = ws.lastRow!.number + 1;
    ws.getRow(headerGroupRowIndex); // chỉ để ensure row tồn tại

    // merge Phim
    ws.mergeCells(headerGroupRowIndex, 1, headerGroupRowIndex + 1, 1);
    ws.getCell(headerGroupRowIndex, 1).value = "Phim";

    // Nội dung chi tiết
    ws.mergeCells(headerGroupRowIndex, 2, headerGroupRowIndex, 5);
    ws.getCell(headerGroupRowIndex, 2).value = "Nội dung chi tiết";

    // Loại giá vé
    const priceStartCol = 6;
    const priceEndCol = 5 + allPrices.length;

    ws.mergeCells(headerGroupRowIndex, priceStartCol, headerGroupRowIndex, priceEndCol);
    ws.getCell(headerGroupRowIndex, priceStartCol).value = "Loại giá vé (Đơn vị tính: 1000 đồng)";

    // Tổng hợp
    const totalStartCol = priceEndCol + 1;
    const totalEndCol = totalStartCol + 6;

    let totalCol = priceEndCol + 1;

    const COL_AMOUNT = totalCol + 3;
    const COL_VNPAY = totalCol + 4;
    const COL_VIETQR = totalCol + 5;
    const COL_ACTUAL = totalCol + 6;

    const moneyFormat = "#,##0";

    [COL_AMOUNT, COL_VNPAY, COL_VIETQR, COL_ACTUAL].forEach((col) => {
      ws.getColumn(col).numFmt = moneyFormat;
    });

    const totalHeaders = [
      "Tổng",
      "Giấy mời",
      "Hợp đồng",
      "Thành tiền",
      "VNPayQR",
      "VietQR",
      "Thực nộp"
    ];

    totalHeaders.forEach((title) => {
      ws.mergeCells(headerGroupRowIndex, totalCol, headerGroupRowIndex + 1, totalCol);
      ws.getCell(headerGroupRowIndex, totalCol).value = title;
      totalCol++;
    });

    // ===== HEADER COLUMN ROW (NGAY SAU, KHÔNG CÓ DÒNG TRỐNG) =====
    const headerRowIndex = headerGroupRowIndex + 1;
    const headerRow = ws.getRow(headerRowIndex);

    let col = 2; // bắt đầu từ cột B vì cột A đã merge Phim

    headerRow.getCell(col++).value = "Ngày";
    headerRow.getCell(col++).value = "Giờ";
    headerRow.getCell(col++).value = "Phòng";
    headerRow.getCell(col++).value = "Loại";

    allPrices.forEach((p) => {
      headerRow.getCell(col++).value = (p / 1000).toString();
    });

    // style header
    [headerGroupRowIndex, headerRowIndex].forEach((r) => {
      ws.getRow(r).font = { bold: true };
      ws.getRow(r).alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true
      };
      ws.getRow(r).height = 28;
    });

    // ===== BODY =====
    tableData.forEach((r) => {
      ws.addRow([
        r.filmName,
        dayjs(r.projectDate).format("DD/MM/YYYY"),
        r.projectTime,
        r.roomName,
        r.isOnline ? "On" : "Off",
        ...allPrices.map((p) => r.pricesMap[p] ?? ""),
        r.totalQuantity,
        r.totalInvitationQuantity,
        r.totalContractQuantity,
        r.totalSale,
        r.saleVnPayQr,
        r.saleVietQr,
        r.actualSale
      ]);
    });

    // ===== MERGE CELLS (rowSpan) =====
    let rowIndex = headerRowIndex + 1;

    tableData.forEach((r) => {
      if (r.filmRowSpan && r.filmRowSpan > 1) {
        const startRow = rowIndex;
        const endRow = rowIndex + r.filmRowSpan - 1;

        ws.mergeCells(startRow, 1, endRow, 1);

        // 👉 set style cho ô đại diện (AstartRow)
        ws.getCell(startRow, 1).alignment = {
          horizontal: "left",
          vertical: "middle",
          wrapText: true
        };
      }

      if (!r.filmRowSpan || r.filmRowSpan === 1) {
        ws.getCell(rowIndex, 1).alignment = {
          horizontal: "left",
          vertical: "middle",
          wrapText: true
        };
      }

      if (r.dateRowSpan && r.dateRowSpan > 1) {
        ws.mergeCells(rowIndex, 2, rowIndex + r.dateRowSpan - 1, 2);
        const startRow = rowIndex;
        ws.getCell(startRow, 2).alignment = {
          horizontal: "center",
          vertical: "middle"
        };
      }

      if (!r.dateRowSpan || r.dateRowSpan === 1) {
        ws.getCell(rowIndex, 2).alignment = {
          horizontal: "center",
          vertical: "middle"
        };
      }

      if (r.onlineRowSpan && r.onlineRowSpan > 1) {
        ws.mergeCells(rowIndex, 5, rowIndex + r.onlineRowSpan - 1, 5);
      }
      rowIndex++;
    });

    // ===== SUMMARY =====

    const wsSummary = wb.addWorksheet("Tổng hợp theo ngày");
    wsSummary.addRow([
      "Ngày",
      "Loại",
      ...allPrices.map((p) => p / 1000),
      "Tổng",
      "Giấy mời",
      "Hợp đồng",
      "Thành tiền",
      "VNPayQR",
      "VietQR",
      "Thực nộp"
    ]);

    wsSummary.getRow(1).font = { bold: true };
    wsSummary.getRow(1).alignment = {
      horizontal: "center",
      vertical: "middle"
    };
    wsSummary.columns.forEach((c) => (c.width = 14));

    Object.entries(summaryByDate).forEach(([date, group]) => {
      const sum = (rows: Row[]) => {
        const prices: Record<number, number> = {};
        let totalQuantity = 0;
        let totalInvitationQuantity = 0;
        let totalContractQuantity = 0;
        let totalSale = 0;
        let saleVnPayQr = 0;
        let saleVietQr = 0;
        let actualSale = 0;

        rows.forEach((r) => {
          totalQuantity += r.totalQuantity;
          totalInvitationQuantity += r.totalInvitationQuantity;
          totalContractQuantity += r.totalContractQuantity;
          totalSale += r.totalSale;
          saleVnPayQr += r.saleVnPayQr;
          saleVietQr += r.saleVietQr;
          actualSale += r.actualSale;

          Object.entries(r.pricesMap).forEach(([p, q]) => {
            const price = Number(p);
            prices[price] = (prices[price] ?? 0) + q;
          });
        });

        return {
          prices,
          totalQuantity,
          totalInvitationQuantity,
          totalContractQuantity,
          totalSale,
          saleVnPayQr,
          saleVietQr,
          actualSale
        };
      };

      const offSum = sum(group.off);
      const onSum = sum(group.on);

      wsSummary.addRow([
        dayjs(date).format("DD/MM/YYYY"),
        "Off",
        ...allPrices.map((p) => offSum.prices[p] ?? ""),
        offSum.totalQuantity,
        offSum.totalInvitationQuantity,
        offSum.totalContractQuantity,
        offSum.totalSale,
        offSum.saleVnPayQr,
        offSum.saleVietQr,
        offSum.actualSale
      ]);

      wsSummary.addRow([
        dayjs(date).format("DD/MM/YYYY"),
        "On",
        ...allPrices.map((p) => onSum.prices[p] ?? ""),
        onSum.totalQuantity,
        onSum.totalInvitationQuantity,
        onSum.totalContractQuantity,
        onSum.totalSale,
        onSum.saleVnPayQr,
        onSum.saleVietQr,
        onSum.actualSale
      ]);
    });

    // ===== STYLE =====
    ws.columns.forEach((col) => {
      col.width = 14;
    });

    const moneyColsSummary = [
      4 + allPrices.length,
      5 + allPrices.length,
      6 + allPrices.length,
      7 + allPrices.length,
      8 + allPrices.length,
      9 + allPrices.length
    ];

    moneyColsSummary.forEach((col) => {
      wsSummary.getColumn(col).numFmt = "#,##0";
    });

    ws.getColumn(1).width = 40; // phim

    ws.views = [
      {
        state: "frozen",
        ySplit: headerRowIndex,
        xSplit: 1
      }
    ];

    wsSummary.views = [
      {
        state: "frozen",
        ySplit: 1
      }
    ];

    const startRow = headerGroupRowIndex;
    const endRow = ws.lastRow!.number;
    const endCol = totalEndCol;

    for (let r = startRow; r <= endRow; r++) {
      for (let c = 1; c <= endCol; c++) {
        ws.getCell(r, c).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" }
        };
      }
    }

    const row = ws.lastRow!;
    row.getCell(1).alignment = { wrapText: true, vertical: "middle" };

    // Border for summary sheet
    const summaryStartRow = 1; // header
    const summaryEndRow = wsSummary.lastRow!.number;
    const summaryEndCol = 9 + allPrices.length;

    for (let r = summaryStartRow; r <= summaryEndRow; r++) {
      for (let c = 1; c <= summaryEndCol; c++) {
        wsSummary.getCell(r, c).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" }
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
