import Icon from "@ant-design/icons";
import { saveExcelFile } from "@renderer/lib/saveFile";
import { usePermission } from "@renderer/permissions/usePermission";
import { YearlyReportSummaryItem } from "@shared/types";
import { Button } from "antd";
import ExcelJS from "exceljs";
import { DownloadIcon } from "lucide-react";

type Props = {
  tableData: YearlyReportSummaryItem[];
  fileName?: string;
  year: number;
};

const ExportRevenueExcelButton = ({
  tableData,
  fileName = "bao-cao-nam-tong-hop-so-lieu.xlsx",
  year
}: Props) => {
  const { can } = usePermission();
  const canExport = can("yearly_report", "export");
  const isDisabled = tableData.length === 0;

  if (!canExport) {
    return null;
  }

  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Tổng hợp");

    ws.getCell(1, 1).value = `BÁO CÁO NĂM TỔNG HỢP SỐ LIỆU PHIM CHIẾU - ${year}`;
    ws.mergeCells(1, 1, 1, 6);
    ws.getRow(1).font = { bold: true, size: 16 };
    ws.getRow(1).alignment = { horizontal: "center" };

    ws.addRow([
      "Đơn vị phát hành",
      "Tổng phim",
      "Tổng buổi chiếu",
      "Tổng khán giả",
      "Tổng doanh thu",
      "DT chia sẻ"
    ]);

    ws.getRow(2).font = { bold: true };
    ws.getRow(2).alignment = { horizontal: "center", vertical: "middle" };

    tableData.forEach((item) => {
      ws.addRow([
        item.manufacturerName,
        item.totalFilms,
        item.totalPlans,
        item.totalTicketsSold,
        item.totalRevenue,
        item.totalSharedRevenue
      ]);
    });

    ws.getColumn(1).width = 40;
    for (let column = 2; column <= 6; column += 1) {
      ws.getColumn(column).width = 16;
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

        if (rowNumber >= 3 && colNumber > 1) {
          cell.numFmt = "#,##0";
        }
      });
    });

    ws.views = [{ state: "frozen", ySplit: 2, xSplit: 1 }];

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
