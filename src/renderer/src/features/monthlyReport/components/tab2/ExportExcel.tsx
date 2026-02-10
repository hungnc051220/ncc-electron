"use client";

import { Button } from "antd";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { TreeRow } from ".";
import dayjs from "dayjs";

type Props = {
  treeData: TreeRow[]; // data của Tree Table
  allPrices: number[]; // ["1","2","3",...]
  fileName?: string;
  fromDate: string;
};

const ExportRevenueExcelButton = ({
  treeData,
  allPrices,
  fileName = "bao-cao-doanh-thu-theo-tung-loai-ve.xlsx",
  fromDate
}: Props) => {
  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Chi tiết");

    // ================= TITLE =================
    ws.addRow([]);
    ws.getCell(1, 1).value =
      `BÁO CÁO DOANH THU VÉ THEO TỪNG LOẠI VÉ - THÁNG ${dayjs(fromDate).format("MM/YYYY")}`;
    ws.mergeCells(1, 1, 1, 4 + allPrices.length * 4 + 2); // tổng số cột
    ws.getRow(1).font = { bold: true, size: 16 };
    ws.getRow(1).alignment = { horizontal: "center", vertical: "middle" };

    ws.addRow([]);

    ws.getCell(2, 1).value = `Ngày in: ${dayjs().format("DD/MM/YYYY HH:mm")}`;
    ws.mergeCells(2, 1, 2, 4 + allPrices.length * 4 + 2);
    ws.getRow(2).alignment = { horizontal: "right" };

    ws.addRow([]);

    // ================= HEADER =================
    const headerStartRow = ws.lastRow!.number + 1;
    // ---- Fixed columns (merge dọc 4 dòng) ----
    ws.mergeCells(headerStartRow, 1, headerStartRow + 3, 1);
    ws.mergeCells(headerStartRow, 2, headerStartRow + 3, 2);
    ws.mergeCells(headerStartRow, 3, headerStartRow + 3, 3);
    ws.mergeCells(headerStartRow, 4, headerStartRow + 3, 4);

    ws.getCell(headerStartRow, 1).value = "Hãng phim / Phim";
    ws.getCell(headerStartRow, 2).value = "Ngày";
    ws.getCell(headerStartRow, 3).value = "Giờ";
    ws.getCell(headerStartRow, 4).value = "Version";

    // ---- Price group ----
    const priceGroupStartCol = 5;
    const priceGroupEndCol = 4 + allPrices.length * 4 + 2; // +2 cho cột Tổng

    ws.mergeCells(headerStartRow, priceGroupStartCol, headerStartRow, priceGroupEndCol);

    ws.getCell(headerStartRow, priceGroupStartCol).value = "Loại giá vé (Đơn vị tính: 1.000đ)";

    let colIndex = priceGroupStartCol;

    allPrices.forEach((p) => {
      // Giá
      ws.mergeCells(headerStartRow + 1, colIndex, headerStartRow + 1, colIndex + 3);
      ws.getCell(headerStartRow + 1, colIndex).value = (p / 1000).toString();

      // Online
      ws.mergeCells(headerStartRow + 2, colIndex, headerStartRow + 2, colIndex + 1);
      ws.getCell(headerStartRow + 2, colIndex).value = "Online";

      // Offline
      ws.mergeCells(headerStartRow + 2, colIndex + 2, headerStartRow + 2, colIndex + 3);
      ws.getCell(headerStartRow + 2, colIndex + 2).value = "Offline";

      // Vé / Tiền
      ws.getCell(headerStartRow + 3, colIndex).value = "Vé";
      ws.getCell(headerStartRow + 3, colIndex + 1).value = "Tiền";
      ws.getCell(headerStartRow + 3, colIndex + 2).value = "Vé";
      ws.getCell(headerStartRow + 3, colIndex + 3).value = "Tiền";

      colIndex += 4;
    });

    const totalStart = colIndex;
    ws.mergeCells(headerStartRow + 1, totalStart, headerStartRow + 2, totalStart + 1);
    ws.getCell(headerStartRow + 1, totalStart).value = "Tổng";
    ws.getCell(headerStartRow + 3, totalStart).value = "Vé";
    ws.getCell(headerStartRow + 3, totalStart + 1).value = "Tiền";

    // ===== HEADER STYLE =====
    for (let r = headerStartRow; r <= headerStartRow + 3; r++) {
      const row = ws.getRow(r);
      row.font = { bold: true };
      row.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true
      };
      row.height = 28;
    }

    // ================= DATA =================

    const dataStartRow = headerStartRow + 4;

    function addRow(row: TreeRow, level: number) {
      const r: (string | number)[] = [
        row.name || "",
        row.date || "",
        row.time || "",
        row.version || ""
      ];

      allPrices.forEach((p) => {
        r.push(row[`price_${p}_online`]?.tickets || "");
        r.push(row[`price_${p}_online`]?.revenue || "");
        r.push(row[`price_${p}_offline`]?.tickets || "");
        r.push(row[`price_${p}_offline`]?.revenue || "");
      });

      r.push(row.totalTickets || "");
      r.push(row.totalRevenue || "");

      const excelRow = ws.addRow(r);

      excelRow.getCell(1).alignment = {
        vertical: "middle",
        horizontal: "left",
        indent: level * 2
      };

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

      row.children?.forEach((c) => addRow(c, level + 1));
    }

    treeData.forEach((m) => addRow(m, 0));

    // ================= STYLE =================

    ws.columns.forEach((c) => {
      c.width = 14;
    });
    ws.getColumn(1).width = 45;

    ws.eachRow((row) => {
      row.eachCell((cell, cn) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" }
        };
        cell.alignment = {
          vertical: "middle",
          horizontal: cn === 1 ? "left" : "center", //
          wrapText: true
        };
      });
    });

    // format money
    ws.eachRow((row, rn) => {
      if (rn >= dataStartRow) {
        row.eachCell((cell, cn) => {
          if (cn >= 6 && typeof cell.value === "number") {
            cell.numFmt = "#,##0";
          }
        });
      }
    });

    // freeze header (3 dòng header + 3 dòng title)
    ws.views = [
      {
        state: "frozen",
        ySplit: 6,
        xSplit: 1
      }
    ];

    // ================= SAVE =================

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
