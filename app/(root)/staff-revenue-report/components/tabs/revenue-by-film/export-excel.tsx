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
  fileName = "bao-cao-doanh-thu-phim.xlsx",
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
      "Thực nộp",
    ];

    const totalColumns = header.length;

    // ===== TITLE =====
    ws.addRow([]);
    ws.getCell(1, 1).value = "BẢNG THỐNG KÊ DOANH THU PHIM THEO NHÂN VIÊN";
    ws.mergeCells(1, 1, 1, totalColumns);
    ws.getRow(1).font = { bold: true, size: 16 };
    ws.getRow(1).alignment = { horizontal: "center" };

    ws.addRow([]);
    ws.getCell(2, 1).value = `Từ ngày: ${dayjs(fromDate).format("DD/MM/YYYY")}`;
    ws.mergeCells(2, 1, 2, Math.floor(totalColumns / 2));

    ws.getCell(2, Math.floor(totalColumns / 2) + 1).value = `Đến ngày: ${dayjs(
      toDate
    ).format("DD/MM/YYYY")}`;
    ws.mergeCells(2, Math.floor(totalColumns / 2) + 1, 2, totalColumns);

    ws.addRow([]);
    ws.getCell(3, 1).value = `Nhân viên: ${employeeName}`;
    ws.mergeCells(3, 1, 3, totalColumns);

    // ===== HEADER GROUP ROW =====
    const headerGroupRowIndex = ws.lastRow!.number + 1;
    ws.getRow(headerGroupRowIndex); // chỉ để ensure row tồn tại

    // merge Phim
    ws.mergeCells(headerGroupRowIndex, 1, headerGroupRowIndex + 1, 1);

    // Nội dung chi tiết
    ws.mergeCells(headerGroupRowIndex, 2, headerGroupRowIndex, 5);
    ws.getCell(headerGroupRowIndex, 2).value = "Nội dung chi tiết";

    // Loại giá vé
    const priceStartCol = 6;
    const priceEndCol = 5 + allPrices.length;

    ws.mergeCells(
      headerGroupRowIndex,
      priceStartCol,
      headerGroupRowIndex,
      priceEndCol
    );
    ws.getCell(headerGroupRowIndex, priceStartCol).value =
      "Loại giá vé (Đơn vị tính: 1000 đồng)";

    // Tổng hợp
    const totalStartCol = priceEndCol + 1;
    const totalEndCol = totalStartCol + 6;

    // ws.mergeCells(
    //   headerGroupRowIndex,
    //   totalStartCol,
    //   headerGroupRowIndex + 1,
    //   totalEndCol
    // );
    // ws.getCell(headerGroupRowIndex, totalStartCol).value = "Tổng hợp";

    // ===== HEADER COLUMN ROW (NGAY SAU, KHÔNG CÓ DÒNG TRỐNG) =====
    const headerRowIndex = headerGroupRowIndex + 1;
    ws.getRow(headerRowIndex).values = [
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
      "Thực nộp",
    ];

    // style header
    [headerGroupRowIndex, headerRowIndex].forEach((r) => {
      ws.getRow(r).font = { bold: true };
      ws.getRow(r).alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
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
        r.actualSale,
      ]);
    });

    // ===== MERGE CELLS (rowSpan) =====
    let rowIndex = headerRowIndex + 1;

    tableData.forEach((r) => {
      if (r.filmRowSpan && r.filmRowSpan > 1) {
        ws.mergeCells(rowIndex, 1, rowIndex + r.filmRowSpan - 1, 1);
      }
      if (r.dateRowSpan && r.dateRowSpan > 1) {
        ws.mergeCells(rowIndex, 2, rowIndex + r.dateRowSpan - 1, 2);
      }
      if (r.onlineRowSpan && r.onlineRowSpan > 1) {
        ws.mergeCells(rowIndex, 5, rowIndex + r.onlineRowSpan - 1, 5);
      }
      rowIndex++;
    });

    // ===== SUMMARY =====
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
          actualSale,
        };
      };

      const offSum = sum(group.off);
      const onSum = sum(group.on);

      ws.addRow([
        dayjs(date).format("DD/MM/YYYY"),
        "",
        "",
        "",
        "Off",
        ...allPrices.map((p) => offSum.prices[p] ?? ""),
        offSum.totalQuantity,
        offSum.totalInvitationQuantity,
        offSum.totalContractQuantity,
        offSum.totalSale,
        offSum.saleVnPayQr,
        offSum.saleVietQr,
        offSum.actualSale,
      ]);

      ws.addRow([
        dayjs(date).format("DD/MM/YYYY"),
        "",
        "",
        "",
        "On",
        ...allPrices.map((p) => onSum.prices[p] ?? ""),
        onSum.totalQuantity,
        onSum.totalInvitationQuantity,
        onSum.totalContractQuantity,
        onSum.totalSale,
        onSum.saleVnPayQr,
        onSum.saleVietQr,
        onSum.actualSale,
      ]);
    });

    // ===== STYLE =====
    ws.columns.forEach((col) => {
      col.width = 14;
    });

    ws.views = [
      {
        state: "frozen",
        ySplit: headerRowIndex,
        xSplit: 1,
      },
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
          right: { style: "thin" },
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
