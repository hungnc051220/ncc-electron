import Icon from "@ant-design/icons";
import { saveExcelFile } from "@renderer/lib/saveFile";
import { usePermission } from "@renderer/permissions/usePermission";
import { Button } from "antd";
import ExcelJS from "exceljs";
import { DownloadIcon } from "lucide-react";
import { TimeTreeRow } from ".";
import dayjs from "dayjs";
import { formatQuarterFileNameLabel, formatQuarterLabel } from "../../utils";

function cellValue(v?: number) {
  if (!v || v === 0) return "";
  return v;
}

type Props = {
  treeData: TimeTreeRow[];
  allTimes: string[];
  fileName?: string;
  fromDate: string;
  compareDate?: string;
  loading?: boolean;
};

const ExportRevenueExcelButton = ({
  treeData,
  allTimes,
  fileName,
  fromDate,
  compareDate,
  loading
}: Props) => {
  const { can } = usePermission();
  const canExport = can("quarterly_report", "export");
  const isComparison = !!compareDate;
  const isDisabled = loading || treeData.length === 0 || (!isComparison && allTimes.length === 0);

  if (!canExport) {
    return null;
  }

  const getNumberValue = (value: TimeTreeRow[string]) => (typeof value === "number" ? value : "");

  const getDeltaValue = (value: TimeTreeRow[string]) => {
    if (typeof value !== "number" || value === 0) {
      return "";
    }

    return value > 0 ? `+${value}` : value;
  };

  const getDeltaPercentValue = (value: TimeTreeRow[string]) => {
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
      [4, 5, 8, 9, 12, 13, 16, 17].forEach((colIndex) => {
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
    const title = `SO SÁNH DOANH THU, KHÁN GIẢ THEO PHÒNG CHIẾU - ${currentLabel} VÀ ${compareLabel}`;
    const defaultFileName = `So sánh doanh thu, khán giả theo phòng chiếu - ${formatQuarterFileNameLabel(
      fromDate
    )} và ${compareDate ? formatQuarterFileNameLabel(compareDate) : ""}.xlsx`;

    ws.addRow([]);
    ws.getCell(1, 1).value = title;
    ws.mergeCells(1, 1, 1, 17);
    ws.getRow(1).font = { bold: true, size: 16 };
    ws.getRow(1).alignment = { horizontal: "center" };

    ws.addRow([]);
    ws.getCell(2, 1).value = `Ngày in: ${dayjs().format("DD/MM/YYYY HH:mm")}`;
    ws.mergeCells(2, 1, 2, 17);
    ws.getRow(2).alignment = { horizontal: "right" };
    ws.addRow([]);

    const headerStartRow = ws.lastRow!.number + 1;
    ws.mergeCells(headerStartRow, 1, headerStartRow + 1, 1);
    ws.getCell(headerStartRow, 1).value = "Phòng";

    const groups = ["Vé V", "Vé T", "Tổng vé", "Doanh thu"];
    groups.forEach((group, index) => {
      const startCol = 2 + index * 4;
      ws.mergeCells(headerStartRow, startCol, headerStartRow, startCol + 3);
      ws.getCell(headerStartRow, startCol).value = group;
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

    treeData.forEach((row) => {
      ws.addRow([
        row.label,
        getNumberValue(row.currentTotalV),
        getNumberValue(row.compareTotalV),
        getDeltaValue(row.totalVDiff),
        getDeltaPercentValue(row.totalVPercent),
        getNumberValue(row.currentTotalT),
        getNumberValue(row.compareTotalT),
        getDeltaValue(row.totalTDiff),
        getDeltaPercentValue(row.totalTPercent),
        getNumberValue(row.currentTotalTickets),
        getNumberValue(row.compareTotalTickets),
        getDeltaValue(row.totalTicketsDiff),
        getDeltaPercentValue(row.totalTicketsPercent),
        getNumberValue(row.currentTotalRevenue),
        getNumberValue(row.compareTotalRevenue),
        getDeltaValue(row.totalRevenueDiff),
        getDeltaPercentValue(row.totalRevenuePercent)
      ]);
    });

    ws.getColumn(1).width = 28;
    for (let colIndex = 2; colIndex <= 17; colIndex++) {
      ws.getColumn(colIndex).width = colIndex % 4 === 1 ? 12 : 14;
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
        if (rowIndex > headerStartRow + 1 && colIndex > 1 && ![5, 9, 13, 17].includes(colIndex)) {
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
    const title = `BÁO CÁO SUẤT CHIẾU THEO PHÒNG - ${currentLabel}`;
    const defaultFileName = `Suất chiếu theo phòng - ${formatQuarterFileNameLabel(fromDate)}.xlsx`;

    // ================= TITLE =================
    ws.addRow([]);
    ws.getCell(1, 1).value = title;
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
