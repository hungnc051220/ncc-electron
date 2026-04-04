import Icon from "@ant-design/icons";
import { saveExcelFile } from "@renderer/lib/saveFile";
import { usePermission } from "@renderer/permissions/usePermission";
import { Button } from "antd";
import ExcelJS from "exceljs";
import { DownloadIcon } from "lucide-react";
import { TreeRow } from ".";
import { QUARTERS } from "../yearlyReport.utils";

type Props = {
  treeData: TreeRow[];
  fileName?: string;
  year: number;
};

const ExportRevenueExcelButton = ({
  treeData,
  fileName = "bao-cao-nam-doanh-thu-phim-viet.xlsx",
  year
}: Props) => {
  const { can } = usePermission();
  const canExport = can("yearly_report", "export");
  const isDisabled = treeData.length === 0;

  if (!canExport) {
    return null;
  }

  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Doanh thu phim Việt");
    const totalColumns = 1 + QUARTERS.length * 3 + 3;

    ws.getCell(1, 1).value = `BÁO CÁO DOANH THU PHIM VIỆT - NĂM ${year}`;
    ws.mergeCells(1, 1, 1, totalColumns);
    ws.getRow(1).font = { bold: true, size: 16 };
    ws.getRow(1).alignment = { horizontal: "center" };

    const headerTopRow = 3;
    const headerBottomRow = 4;

    ws.mergeCells(headerTopRow, 1, headerBottomRow, 1);
    ws.getCell(headerTopRow, 1).value = "Hãng phim / Phim";

    QUARTERS.forEach((quarter, index) => {
      const startCol = 2 + index * 3;
      ws.mergeCells(headerTopRow, startCol, headerTopRow, startCol + 2);
      ws.getCell(headerTopRow, startCol).value = `Quý ${quarter}`;
      ws.getCell(headerBottomRow, startCol).value = "Buổi chiếu";
      ws.getCell(headerBottomRow, startCol + 1).value = "Khán giả";
      ws.getCell(headerBottomRow, startCol + 2).value = "Doanh thu";
    });

    const totalStartCol = 2 + QUARTERS.length * 3;
    ws.mergeCells(headerTopRow, totalStartCol, headerTopRow, totalStartCol + 2);
    ws.getCell(headerTopRow, totalStartCol).value = "Cả năm";
    ws.getCell(headerBottomRow, totalStartCol).value = "Buổi chiếu";
    ws.getCell(headerBottomRow, totalStartCol + 1).value = "Khán giả";
    ws.getCell(headerBottomRow, totalStartCol + 2).value = "Doanh thu";

    [headerTopRow, headerBottomRow].forEach((rowIndex) => {
      ws.getRow(rowIndex).font = { bold: true };
      ws.getRow(rowIndex).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    });

    const addDataRow = (row: TreeRow, level = 0) => {
      const values: (string | number)[] = [" ".repeat(level * 2) + row.name];

      QUARTERS.forEach((quarter) => {
        values.push(Number(row[`q${quarter}Screenings`] || 0));
        values.push(Number(row[`q${quarter}Tickets`] || 0));
        values.push(Number(row[`q${quarter}Revenue`] || 0));
      });

      values.push(Number(row.totalScreenings || 0));
      values.push(Number(row.totalTicketsSold || 0));
      values.push(Number(row.totalRevenue || 0));

      const excelRow = ws.addRow(values);
      excelRow.font = row.isSummary ? { bold: true } : {};
      excelRow.getCell(1).alignment = { horizontal: "left", indent: level * 2 };

      row.children?.forEach((child) => addDataRow(child, level + 1));
    };

    treeData.forEach((row) => addDataRow(row));

    ws.getColumn(1).width = 42;
    for (let column = 2; column <= totalColumns; column += 1) {
      ws.getColumn(column).width = 14;
    }

    ws.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" }
        };
        cell.alignment = {
          vertical: "middle",
          horizontal: colNumber === 1 ? "left" : "right",
          wrapText: true
        };

        if (rowNumber >= 5 && colNumber > 1) {
          cell.numFmt = "#,##0";
        }
      });
    });

    ws.views = [{ state: "frozen", ySplit: 4, xSplit: 1 }];

    const buf = await wb.xlsx.writeBuffer();
    await saveExcelFile(new Uint8Array(buf), fileName);
  };
  return (
    <Button
      variant="solid"
      color="green"
      disabled={isDisabled}
      onClick={exportExcel}
      icon={<Icon component={DownloadIcon} />}
    >
      Xuất excel
    </Button>
  );
};

export default ExportRevenueExcelButton;
