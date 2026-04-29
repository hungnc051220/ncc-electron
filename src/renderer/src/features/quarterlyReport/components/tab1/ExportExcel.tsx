import Icon from "@ant-design/icons";
import { saveExcelFile } from "@renderer/lib/saveFile";
import { usePermission } from "@renderer/permissions/usePermission";
import { Button } from "antd";
import ExcelJS from "exceljs";
import { DownloadIcon } from "lucide-react";
import { TreeRow } from ".";
import { formatQuarterFileNameLabel, formatQuarterLabel } from "../../utils";

type Props = {
  treeData: TreeRow[]; // data của Tree Table
  rooms: string[]; // ["1","2","3",...]
  fileName?: string;
  fromDate: string;
  compareDate?: string;
  loading?: boolean;
};

const ExportRevenueExcelButton = ({
  treeData,
  rooms,
  fileName,
  fromDate,
  compareDate,
  loading
}: Props) => {
  const { can } = usePermission();
  const canExport = can("quarterly_report", "export");
  const isComparison = !!compareDate;
  const isDisabled = loading || treeData.length === 0 || rooms.length === 0;

  if (!canExport) {
    return null;
  }

  const getDisplayValue = (value: TreeRow[string]) =>
    typeof value === "number" ? value : value || "";

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

  const addStandardHeader = (
    ws: ExcelJS.Worksheet,
    headerGroupRow: number,
    totalColumns: number
  ) => {
    ws.mergeCells(headerGroupRow, 1, headerGroupRow + 1, 1);
    ws.getCell(headerGroupRow, 1).value = "Hãng phim / Phim";

    ws.mergeCells(headerGroupRow, 2, headerGroupRow, totalColumns);
    ws.getCell(headerGroupRow, 2).value = "Số buổi chiếu";

    const headerRow = headerGroupRow + 1;
    const roomHeaderRow = ws.getRow(headerRow);

    rooms.forEach((room, index) => {
      roomHeaderRow.getCell(2 + index).value = `P${room}`;
    });

    return headerRow;
  };

  const addComparisonHeader = (
    ws: ExcelJS.Worksheet,
    headerGroupRow: number,
    totalColumns: number,
    currentLabel: string,
    compareLabel: string
  ) => {
    ws.mergeCells(headerGroupRow, 1, headerGroupRow + 2, 1);
    ws.getCell(headerGroupRow, 1).value = "Hãng phim / Phim";

    ws.mergeCells(headerGroupRow, 2, headerGroupRow, totalColumns);
    ws.getCell(headerGroupRow, 2).value = "So sánh số buổi chiếu";

    rooms.forEach((room, roomIndex) => {
      const startCol = 2 + roomIndex * 4;
      const endCol = startCol + 3;

      ws.mergeCells(headerGroupRow + 1, startCol, headerGroupRow + 1, endCol);
      ws.getCell(headerGroupRow + 1, startCol).value = `P${room}`;

      ws.getCell(headerGroupRow + 2, startCol).value = currentLabel;
      ws.getCell(headerGroupRow + 2, startCol + 1).value = compareLabel;
      ws.getCell(headerGroupRow + 2, startCol + 2).value = "+/-";
      ws.getCell(headerGroupRow + 2, startCol + 3).value = "%";
    });

    return headerGroupRow + 2;
  };

  const addStandardRows = (ws: ExcelJS.Worksheet) => {
    treeData.forEach((group) => {
      ws.addRow([group.name, ...rooms.map((room) => getDisplayValue(group[`P${room}`]))]);

      const groupRowIndex = ws.lastRow!.number;
      ws.getRow(groupRowIndex).font = { bold: true };

      group.children?.forEach((film) => {
        ws.addRow([`   ${film.name}`, ...rooms.map((room) => getDisplayValue(film[`P${room}`]))]);
      });
    });
  };

  const addComparisonRows = (ws: ExcelJS.Worksheet) => {
    treeData.forEach((group) => {
      const groupValues = rooms.flatMap((room) => [
        getDisplayValue(group[`P${room}_current`]),
        getDisplayValue(group[`P${room}_compare`]),
        getDeltaValue(group[`P${room}_diff`]),
        getDeltaPercentValue(group[`P${room}_percent`])
      ]);

      ws.addRow([group.name, ...groupValues]);

      const groupRowIndex = ws.lastRow!.number;
      ws.getRow(groupRowIndex).font = { bold: true };

      group.children?.forEach((film) => {
        const filmValues = rooms.flatMap((room) => [
          getDisplayValue(film[`P${room}_current`]),
          getDisplayValue(film[`P${room}_compare`]),
          getDeltaValue(film[`P${room}_diff`]),
          getDeltaPercentValue(film[`P${room}_percent`])
        ]);

        ws.addRow([`   ${film.name}`, ...filmValues]);
      });
    });
  };

  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Thống kê buổi chiếu");

    const currentLabel = formatQuarterLabel(fromDate);
    const compareLabel = compareDate ? formatQuarterLabel(compareDate) : "";
    const currentFileNameLabel = formatQuarterFileNameLabel(fromDate);
    const compareFileNameLabel = compareDate ? formatQuarterFileNameLabel(compareDate) : "";
    const title = isComparison
      ? `SO SÁNH THỐNG KÊ BUỔI CHIẾU THEO PHÒNG - ${currentLabel} VÀ ${compareLabel}`
      : `THỐNG KÊ BUỔI CHIẾU THEO PHÒNG - ${currentLabel}`;
    const defaultFileName = isComparison
      ? `So sánh thống kê buổi chiếu theo phòng - ${currentFileNameLabel} và ${compareFileNameLabel}.xlsx`
      : `Thống kê buổi chiếu theo phòng - ${currentFileNameLabel}.xlsx`;
    const totalColumns = isComparison ? 1 + rooms.length * 4 : 1 + rooms.length;

    // ===== TITLE =====
    ws.addRow([]);
    ws.getCell(1, 1).value = title;
    ws.mergeCells(1, 1, 1, totalColumns);
    ws.getRow(1).font = { bold: true, size: 16 };
    ws.getRow(1).alignment = { horizontal: "center" };

    ws.addRow([]);

    // ===== HEADER GROUP =====
    const headerGroupRow = ws.lastRow!.number + 1;
    const headerRow = isComparison
      ? addComparisonHeader(ws, headerGroupRow, totalColumns, currentLabel, compareLabel)
      : addStandardHeader(ws, headerGroupRow, totalColumns);

    // style header
    for (let rowIndex = headerGroupRow; rowIndex <= headerRow; rowIndex++) {
      const row = ws.getRow(rowIndex);
      row.font = { bold: true };
      row.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true
      };
      row.height = 28;
    }

    // ===== BODY =====
    if (isComparison) {
      addComparisonRows(ws);
    } else {
      addStandardRows(ws);
    }

    // ===== STYLE =====
    ws.getColumn(1).width = 45;

    if (isComparison) {
      rooms.forEach((_, roomIndex) => {
        const startCol = 2 + roomIndex * 4;
        ws.getColumn(startCol).width = 13;
        ws.getColumn(startCol + 1).width = 13;
        ws.getColumn(startCol + 2).width = 10;
        ws.getColumn(startCol + 3).width = 12;
      });
    } else {
      rooms.forEach((_, index) => {
        ws.getColumn(2 + index).width = 10;
      });
    }

    // freeze header + first column
    ws.views = [
      {
        state: "frozen",
        ySplit: headerRow,
        xSplit: 1
      }
    ];

    // border
    const startRow = headerGroupRow;
    const endRow = ws.lastRow!.number;
    const endCol = totalColumns;

    for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
      for (let colIndex = 1; colIndex <= endCol; colIndex++) {
        const cell = ws.getCell(rowIndex, colIndex);

        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" }
        };

        cell.alignment = {
          vertical: "middle",
          horizontal: colIndex === 1 ? "left" : rowIndex <= headerRow ? "center" : "right",
          wrapText: true
        };
      }
    }

    if (isComparison) {
      for (let rowIndex = headerRow + 1; rowIndex <= endRow; rowIndex++) {
        rooms.forEach((_, roomIndex) => {
          const diffCell = ws.getCell(rowIndex, 2 + roomIndex * 4 + 2);
          const percentCell = ws.getCell(rowIndex, 2 + roomIndex * 4 + 3);

          [diffCell, percentCell].forEach((cell) => {
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
        });
      }
    }

    // keep headers bold after body style pass
    for (let rowIndex = headerGroupRow; rowIndex <= headerRow; rowIndex++) {
      ws.getRow(rowIndex).font = { bold: true };
      ws.getRow(rowIndex).alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true
      };
      ws.getRow(rowIndex).height = 28;
    }

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
