import { Button } from "antd";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { TreeRow } from ".";
import dayjs from "dayjs";

type Props = {
  treeData: TreeRow[]; // data của Tree Table
  rooms: string[]; // ["1","2","3",...]
  fileName?: string;
  fromDate: string;
};

const ExportRevenueExcelButton = ({
  treeData,
  rooms,
  fileName = "bao-cao-thang-buoi-chieu-phim.xlsx",
  fromDate
}: Props) => {
  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Thống kê buổi chiếu");

    const totalColumns = 1 + rooms.length;

    // ===== TITLE =====
    ws.addRow([]);
    ws.getCell(1, 1).value =
      `THỐNG KÊ BUỔI CHIẾU THEO PHÒNG - THÁNG ${dayjs(fromDate).format("MM/YYYY")}`;
    ws.mergeCells(1, 1, 1, totalColumns);
    ws.getRow(1).font = { bold: true, size: 16 };
    ws.getRow(1).alignment = { horizontal: "center" };

    ws.addRow([]);

    // ===== HEADER GROUP =====
    const headerGroupRow = ws.lastRow!.number + 1;

    // cột tên
    ws.mergeCells(headerGroupRow, 1, headerGroupRow + 1, 1);
    ws.getCell(headerGroupRow, 1).value = "Hãng phim / Phim";

    // group số buổi chiếu
    ws.mergeCells(headerGroupRow, 2, headerGroupRow, totalColumns);
    ws.getCell(headerGroupRow, 2).value = "Số buổi chiếu";

    // ===== HEADER ROOM =====
    const headerRow = headerGroupRow + 1;
    const row2 = ws.getRow(headerRow);

    rooms.forEach((r, i) => {
      row2.getCell(2 + i).value = `P${r}`;
    });

    // style header
    [headerGroupRow, headerRow].forEach((r) => {
      ws.getRow(r).font = { bold: true };
      ws.getRow(r).alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true
      };
      ws.getRow(r).height = 28;
    });

    // ===== BODY =====
    treeData.forEach((group) => {
      // ===== row hãng (tổng) =====
      ws.addRow([group.name, ...rooms.map((r) => group[`P${r}`] || "")]);

      const groupRowIndex = ws.lastRow!.number;

      ws.getRow(groupRowIndex).font = { bold: true };

      // ===== row phim =====
      group.children?.forEach((film) => {
        ws.addRow([`   ${film.name}`, ...rooms.map((r) => film[`P${r}`] || "")]);
      });
    });
    // ===== STYLE =====
    ws.getColumn(1).width = 45;
    rooms.forEach((_, i) => {
      ws.getColumn(2 + i).width = 10;
    });

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

    for (let r = startRow; r <= endRow; r++) {
      for (let c = 1; c <= endCol; c++) {
        ws.getCell(r, c).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" }
        };

        ws.getCell(r, c).alignment = {
          vertical: "middle",
          horizontal: c === 1 ? "left" : "center",
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
