"use client";

import { Button } from "antd";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { TimeTreeRow } from ".";
import dayjs from "dayjs";

function cellValue(v?: number) {
  if (!v || v === 0) return "";
  return v;
}

type Props = {
  treeData: TimeTreeRow[];
  allTimes: string[];
  fileName?: string;
  fromDate: string;
};

const ExportRevenueExcelButton = ({
  treeData,
  allTimes,
  fileName = "bao-cao-quy-suat-chieu-theo-phong.xlsx",
  fromDate
}: Props) => {
  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Chi tiết");

    // ================= TITLE =================
    ws.addRow([]);
    ws.getCell(1, 1).value =
      `BÁO CÁO SUẤT CHIẾU THEO PHÒNG - QUÝ ${dayjs(fromDate).quarter()}/${dayjs(fromDate).year()}`;
    ws.mergeCells(1, 1, 1, 1 + allTimes.length * 4 + 4);
    ws.getRow(1).font = { bold: true, size: 16 };
    ws.getRow(1).alignment = { horizontal: "center" };

    ws.addRow([]);
    ws.getCell(2, 1).value = `Ngày in: ${dayjs().format("DD/MM/YYYY HH:mm")}`;
    ws.mergeCells(2, 1, 2, 1 + allTimes.length * 4 + 4);
    ws.getRow(2).alignment = { horizontal: "right" };

    ws.addRow([]);

    // ================= HEADER =================
    const headerStartRow = ws.lastRow!.number + 1;

    // ---- Fixed column ----
    ws.mergeCells(headerStartRow, 1, headerStartRow + 3, 1);
    ws.getCell(headerStartRow, 1).value = "Phòng / Ngày / Kênh";

    // ---- Suất chiếu group ----
    const timeStartCol = 2;
    const timeEndCol = 1 + allTimes.length * 4;

    ws.mergeCells(headerStartRow, timeStartCol, headerStartRow, timeEndCol);
    ws.getCell(headerStartRow, timeStartCol).value = "Suất chiếu";

    let col = timeStartCol;

    allTimes.forEach((t) => {
      ws.mergeCells(headerStartRow + 1, col, headerStartRow + 1, col + 3);
      ws.getCell(headerStartRow + 1, col).value = t;

      ws.getCell(headerStartRow + 2, col).value = "Vé V";
      ws.getCell(headerStartRow + 2, col + 1).value = "Vé T";
      ws.getCell(headerStartRow + 2, col + 2).value = "Tổng vé";
      ws.getCell(headerStartRow + 2, col + 3).value = "Doanh thu";

      col += 4;
    });

    // ---- Total ----
    const totalStart = col;

    ws.mergeCells(headerStartRow, totalStart, headerStartRow + 1, totalStart + 3);
    ws.getCell(headerStartRow, totalStart).value = "Tổng";

    ws.getCell(headerStartRow + 2, totalStart).value = "Vé V";
    ws.getCell(headerStartRow + 2, totalStart + 1).value = "Vé T";
    ws.getCell(headerStartRow + 2, totalStart + 2).value = "Tổng vé";
    ws.getCell(headerStartRow + 2, totalStart + 3).value = "Doanh thu";

    // ---- Header style ----
    for (let r = headerStartRow; r <= headerStartRow + 2; r++) {
      ws.getRow(r).eachCell((cell, cn) => {
        cell.font = { bold: true };
        cell.alignment = {
          vertical: "middle",
          horizontal: cn === 1 ? "left" : "center",
          wrapText: true
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF2F2F2" }
        };
      });
    }

    // ================= DATA =================
    function addRow(row: TimeTreeRow, level: number) {
      const r: (string | number)[] = [];

      let label = row.label;

      // format ngày
      if (/^\d{4}-\d{2}-\d{2}/.test(label)) {
        label = dayjs(label).format("DD/MM/YYYY");
      }

      r.push(" ".repeat(level * 3) + label);

      allTimes.forEach((t) => {
        r.push(cellValue(row[`${t}_V`] as number));
        r.push(cellValue(row[`${t}_T`] as number));
        r.push(cellValue(row[`${t}_C`] as number));
        r.push(cellValue(row[`${t}_R`] as number));
      });

      r.push(cellValue(row.totalV));
      r.push(cellValue(row.totalT));
      r.push(cellValue(row.totalTickets));
      r.push(cellValue(row.totalRevenue));

      const excelRow = ws.addRow(r);

      // style by level
      if (level === 0) {
        excelRow.font = { bold: true };
        excelRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFEFEFEF" }
        };
      } else if (level === 1) {
        excelRow.font = { bold: true };
      }

      excelRow.getCell(1).alignment = { horizontal: "left", indent: level * 2 };

      row.children?.forEach((c) => addRow(c, level + 1));
    }

    treeData.forEach((r) => addRow(r, 0));

    // ================= BORDER + FORMAT =================
    ws.eachRow((row) => {
      row.eachCell((cell, cn) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" }
        };

        if (cn > 1 && typeof cell.value === "number") {
          if (cn % 4 === 1 || cn % 4 === 2 || cn % 4 === 3) {
            cell.numFmt = "#,##0";
          } else {
            cell.numFmt = "#,##0";
          }
        }
      });
    });

    // ===== COLUMN WIDTH =====
    ws.getColumn(1).width = 28; // cột tên rộng ra

    for (let i = 2; i <= 1 + allTimes.length * 4 + 4; i++) {
      ws.getColumn(i).width = 14;
    }

    // ================= FREEZE =================
    ws.views = [
      {
        state: "frozen",
        ySplit: headerStartRow + 3,
        xSplit: 1
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
