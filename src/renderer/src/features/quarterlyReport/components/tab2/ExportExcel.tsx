import Icon from "@ant-design/icons";
import { saveExcelFile } from "@renderer/lib/saveFile";
import { usePermission } from "@renderer/permissions/usePermission";
import { Button } from "antd";
import ExcelJS from "exceljs";
import { DownloadIcon } from "lucide-react";
import { TreeRow } from ".";
import dayjs from "dayjs";
import { formatQuarterFileNameLabel, formatQuarterLabel } from "../../utils";

type Props = {
  treeData: TreeRow[]; // data của Tree Table
  allPrices: number[]; // ["1","2","3",...]
  fileName?: string;
  fromDate: string;
  compareDate?: string;
  loading?: boolean;
};

const ExportRevenueExcelButton = ({
  treeData,
  allPrices,
  fileName,
  fromDate,
  compareDate,
  loading
}: Props) => {
  const { can } = usePermission();
  const canExport = can("quarterly_report", "export");
  const isComparison = !!compareDate;
  const isDisabled = loading || treeData.length === 0 || (!isComparison && allPrices.length === 0);

  if (!canExport) {
    return null;
  }

  const getNumberValue = (value: TreeRow[string]) => (typeof value === "number" ? value : "");

  const getDeltaValue = (value: TreeRow[string]) => {
    if (typeof value !== "number" || value === 0) {
      return "";
    }

    return value > 0 ? `+${value}` : value;
  };

  const getDeltaPercentValue = (value: TreeRow[string]) => {
    if (typeof value !== "number") {
      return "";
    }

    return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  const styleComparisonDiffCells = (
    ws: ExcelJS.Worksheet,
    headerEndRow: number,
    endRow: number
  ) => {
    for (let rowIndex = headerEndRow + 1; rowIndex <= endRow; rowIndex++) {
      [4, 5, 8, 9].forEach((colIndex) => {
        const cell = ws.getCell(rowIndex, colIndex);
        if (typeof cell.value !== "number" && typeof cell.value !== "string") {
          return;
        }

        const rawValue = String(cell.value).replace("%", "");
        const numericValue = Number(rawValue.trim());
        if (Number.isNaN(numericValue) || numericValue === 0) {
          return;
        }

        cell.font = {
          ...(cell.font || {}),
          color: { argb: numericValue > 0 ? "FF00A651" : "FFFF0000" }
        };
      });
    }
  };

  const exportComparisonExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Chi tiết");
    const currentLabel = formatQuarterLabel(fromDate);
    const compareLabel = compareDate ? formatQuarterLabel(compareDate) : "";
    const title = `SO SÁNH DOANH THU VÉ THEO TỪNG LOẠI VÉ - ${currentLabel} VÀ ${compareLabel}`;
    const defaultFileName = `So sánh doanh thu vé theo từng loại vé - ${formatQuarterFileNameLabel(
      fromDate
    )} và ${compareDate ? formatQuarterFileNameLabel(compareDate) : ""}.xlsx`;

    ws.addRow([]);
    ws.getCell(1, 1).value = title;
    ws.mergeCells(1, 1, 1, 9);
    ws.getRow(1).font = { bold: true, size: 16 };
    ws.getRow(1).alignment = { horizontal: "center", vertical: "middle" };

    ws.addRow([]);
    ws.getCell(2, 1).value = `Ngày in: ${dayjs().format("DD/MM/YYYY HH:mm")}`;
    ws.mergeCells(2, 1, 2, 9);
    ws.getRow(2).alignment = { horizontal: "right" };
    ws.addRow([]);

    const headerStartRow = ws.lastRow!.number + 1;
    ws.mergeCells(headerStartRow, 1, headerStartRow + 1, 1);
    ws.getCell(headerStartRow, 1).value = "Hãng phim / Phim";

    ws.mergeCells(headerStartRow, 2, headerStartRow, 5);
    ws.getCell(headerStartRow, 2).value = "So sánh tổng vé";
    ws.mergeCells(headerStartRow, 6, headerStartRow, 9);
    ws.getCell(headerStartRow, 6).value = "So sánh tổng tiền";

    [2, 6].forEach((startCol) => {
      ws.getCell(headerStartRow + 1, startCol).value = currentLabel;
      ws.getCell(headerStartRow + 1, startCol + 1).value = compareLabel;
      ws.getCell(headerStartRow + 1, startCol + 2).value = "+/-";
      ws.getCell(headerStartRow + 1, startCol + 3).value = "%";
    });

    for (let rowIndex = headerStartRow; rowIndex <= headerStartRow + 1; rowIndex++) {
      const row = ws.getRow(rowIndex);
      row.font = { bold: true };
      row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      row.height = 28;
    }

    const addRow = (row: TreeRow, level: number) => {
      const excelRow = ws.addRow([
        row.name || "",
        getNumberValue(row.currentTickets),
        getNumberValue(row.compareTickets),
        getDeltaValue(row.ticketDiff),
        getDeltaPercentValue(row.ticketPercent),
        getNumberValue(row.currentRevenue),
        getNumberValue(row.compareRevenue),
        getDeltaValue(row.revenueDiff),
        getDeltaPercentValue(row.revenuePercent)
      ]);

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
      }

      row.children?.forEach((child) => addRow(child, level + 1));
    };

    treeData.forEach((row) => addRow(row, 0));

    ws.getColumn(1).width = 45;
    for (let colIndex = 2; colIndex <= 9; colIndex++) {
      ws.getColumn(colIndex).width = colIndex === 5 || colIndex === 9 ? 12 : 16;
    }

    ws.eachRow((row, rowIndex) => {
      row.eachCell((cell, colIndex) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" }
        };
        cell.alignment = {
          vertical: "middle",
          horizontal: colIndex === 1 ? "left" : rowIndex <= headerStartRow + 1 ? "center" : "right",
          wrapText: true
        };
        if (rowIndex > headerStartRow + 1 && colIndex >= 2 && colIndex !== 5 && colIndex !== 9) {
          cell.numFmt = "#,##0";
        }
      });
    });

    styleComparisonDiffCells(ws, headerStartRow + 1, ws.lastRow!.number);

    ws.views = [{ state: "frozen", ySplit: headerStartRow + 2, xSplit: 1 }];

    const buf = await wb.xlsx.writeBuffer();
    await saveExcelFile(new Uint8Array(buf), fileName || defaultFileName);
  };

  const exportExcel = async () => {
    if (isComparison) {
      await exportComparisonExcel();
      return;
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Chi tiết");
    const currentLabel = formatQuarterLabel(fromDate);
    const title = `BÁO CÁO DOANH THU VÉ THEO TỪNG LOẠI VÉ - ${currentLabel}`;
    const defaultFileName = `Doanh thu vé theo từng loại vé - ${formatQuarterFileNameLabel(
      fromDate
    )}.xlsx`;

    // ================= TITLE =================
    ws.addRow([]);
    ws.getCell(1, 1).value = title;
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
    await saveExcelFile(new Uint8Array(buf), fileName || defaultFileName);
  };
  return (
    <Button
      variant="solid"
      color="green"
      disabled={isDisabled}
      loading={loading}
      onClick={exportExcel}
      icon={<Icon component={DownloadIcon} />}
    >
      Xuất excel
    </Button>
  );
};

export default ExportRevenueExcelButton;
