"use client";

import { Button } from "antd";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import dayjs from "dayjs";
import { ExamineTicketTotalOnlineProps, ExamineTicketTotalProps } from "@renderer/types";
import { TableRow } from ".";

type Props = {
  tableData: TableRow[];
  total?: ExamineTicketTotalProps;
  totalOnline?: ExamineTicketTotalOnlineProps;
  totalOffline?: ExamineTicketTotalOnlineProps;
  fromDate: string;
  toDate: string;
  employeeName?: string;
  fileName?: string;
};

type TotalLike = ExamineTicketTotalProps | ExamineTicketTotalOnlineProps;

const ExportRevenueExcelButton = ({
  tableData,
  fromDate,
  toDate,
  employeeName = "Tất cả",
  fileName = "bao-cao-ra-soat-ve.xlsx",
  total,
  totalOnline,
  totalOffline
}: Props) => {
  const flattenRows = (data: TableRow[]): TableRow[] => {
    const rows: TableRow[] = [];

    data.forEach((film) => {
      rows.push(film); // summary row
      film.children?.forEach((r) => rows.push(r));
    });

    return rows;
  };

  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Chi tiết");

    const header1 = [
      "Phim",
      "Ngày",
      "Giờ",
      "Phòng",
      "Loại",
      "Vé bán",
      "",
      "",
      "Vé Checkin",
      "",
      "",
      "Giấy mời",
      "Tổng",
      "Chưa CI",
      "Đã CI"
    ];

    const header2 = [
      "",
      "",
      "",
      "",
      "",
      "VIP",
      "Thường",
      "HĐ",
      "VIP",
      "Thường",
      "HĐ",
      "",
      "",
      "",
      ""
    ];

    const totalColumns = header1.length;

    // ===== TITLE =====
    ws.addRow([]);
    ws.getCell(1, 1).value = "BẢNG BÁO CÁO RÀ SOÁT VÉ";
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

    ws.addRow(header1); // row: header group
    ws.addRow(header2); // row: sub header

    const headerGroupRow = ws.lastRow!.number - 1;
    const headerRow = ws.lastRow!.number;

    // merge Vé bán
    ws.mergeCells(headerGroupRow, 6, headerGroupRow, 8);
    // merge Vé Checkin
    ws.mergeCells(headerGroupRow, 9, headerGroupRow, 11);

    // merge cột đơn
    [1, 2, 3, 4, 5, 12, 13, 14, 15].forEach((c) => {
      ws.mergeCells(headerGroupRow, c, headerRow, c);
    });

    // style header
    [headerGroupRow, headerRow].forEach((r) => {
      ws.getRow(r).font = { bold: true };
      ws.getRow(r).alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true
      };
    });

    // ===== BODY =====
    const flatRows = flattenRows(tableData || []);

    flatRows.forEach((r) => {
      ws.addRow([
        r.filmName ?? "",
        r.projectDate ? dayjs(r.projectDate).format("DD/MM/YYYY") : "",
        r.projectTime ?? "",
        r.roomName ?? "",
        r.isOnline === undefined ? "" : r.isOnline ? "On" : "Off",

        r.vip ?? "",
        r.regular ?? "",
        r.contract ?? "",

        r.vipCI ?? "",
        r.regularCI ?? "",
        r.contractCI ?? "",

        r.invitation ?? "",
        r.total ?? "",
        r.notCI ?? "",
        r.ci ?? ""
      ]);
    });

    const bodyStartRow = headerRow + 1;

    flatRows.forEach((r, idx) => {
      if (r.isSummary) {
        ws.getRow(bodyStartRow + idx).font = { bold: true };
      }
    });

    // ===== SUMMARY =====

    const addSummaryRow = (label: string, s?: TotalLike) => {
      if (!s) return;
      ws.addRow([
        label,
        "",
        "",
        "",
        "",
        s.totalVipQuantity,
        s.totalRegularQuantity,
        s.totalContractQuantity,
        s.totalVipCIQuantity,
        s.totalRegularCIQuantity,
        s.totalContractCIQuantity,
        s.totalInvitationQuantity,
        s.totalQuantity,
        s.totalNotCIQuantity,
        s.totalCIQuantity
      ]);
    };

    addSummaryRow("TỔNG CỘNG", total);
    addSummaryRow("ONLINE", totalOnline);
    addSummaryRow("OFFLINE", totalOffline);

    // ===== STYLE SUMMARY (IN ĐẬM) =====
    const summaryStartRow = ws.lastRow!.number - 2;

    for (let r = summaryStartRow; r <= ws.lastRow!.number; r++) {
      ws.getRow(r).font = { bold: true };
    }

    const row = ws.lastRow!;
    row.getCell(1).alignment = { wrapText: true, vertical: "middle" };

    // ===== COLUMN WIDTH =====
    ws.getColumn(1).width = 40; // Phim
    ws.getColumn(2).width = 14; // Ngày
    ws.getColumn(3).width = 10; // Giờ
    ws.getColumn(4).width = 10; // Phòng
    ws.getColumn(5).width = 10; // Loại

    for (let c = 6; c <= header1.length; c++) {
      ws.getColumn(c).width = 12;
    }

    for (let r = headerRow + 1; r <= ws.lastRow!.number; r++) {
      ws.getCell(r, 1).alignment = {
        wrapText: true,
        vertical: "middle"
      };
    }

    for (let c = 6; c <= header1.length; c++) {
      ws.getColumn(c).numFmt = "#,##0";
    }

    for (let r = headerRow + 1; r <= ws.lastRow!.number; r++) {
      for (let c = 6; c <= header1.length; c++) {
        ws.getCell(r, c).alignment = {
          horizontal: "right",
          vertical: "middle"
        };
      }
    }

    // ===== BORDER TOÀN BỘ BẢNG =====
    const startRow = headerGroupRow; // bắt đầu từ header
    const endRow = ws.lastRow!.number;
    const endCol = header1.length;

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

    ws.views = [
      {
        state: "frozen",
        ySplit: headerRow,
        xSplit: 1 // freeze cột Phim
      }
    ];

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
