import Icon from "@ant-design/icons";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { saveExcelFile } from "@renderer/lib/saveFile";
import { usePermission } from "@renderer/permissions/usePermission";
import { ReportMonthlyRevenueTicketByStaffProps } from "@shared/types";
import { Button, message } from "antd";
import dayjs from "dayjs";
import ExcelJS from "exceljs";
import { DownloadIcon } from "lucide-react";
import { Row } from ".";

type Props = {
  tableData: Row[];
  data?: ReportMonthlyRevenueTicketByStaffProps;
  fromDate: string;
  employeeName?: string;
  fileName?: string;
};

const REPORT_TITLE = "Báo cáo tháng của nhân viên";

const ExportRevenueExcelButton = ({
  tableData,
  data,
  fromDate,
  employeeName = "Tất cả",
  fileName
}: Props) => {
  const { can } = usePermission();
  const canExport = can("staff_revenue_report", "export");
  const isDisabled = tableData.length === 0 || !data;

  if (!canExport) {
    return null;
  }

  const exportExcel = async () => {
    const messageKey = "export-monthly-revenue-by-ticket";

    message.open({
      key: messageKey,
      type: "loading",
      content: "Đang xuất file excel...",
      duration: 0
    });

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Chi tiết");
      const monthLabel = dayjs(fromDate).format("MM/YYYY");
      const resolvedFileName =
        fileName ?? `${REPORT_TITLE} ${dayjs(fromDate).format("MM-YYYY")}.xlsx`;
      const priceHeaders = data?.priceHeaders ?? [];
      const header = [
        "Ngày",
        "Loại",
        ...priceHeaders.map((price) => (price / 1000).toString()),
        "Tổng vé",
        "Doanh thu"
      ];

      worksheet.addRow([]);
      worksheet.getCell(1, 1).value = REPORT_TITLE.toUpperCase();
      worksheet.mergeCells(1, 1, 1, header.length);
      worksheet.getRow(1).font = { bold: true, size: 16 };
      worksheet.getRow(1).alignment = { horizontal: "center", vertical: "middle" };

      worksheet.addRow([]);
      worksheet.mergeCells(2, 1, 2, header.length);
      worksheet.getCell(2, 1).value = `Tháng: ${monthLabel}`;
      worksheet.getRow(2).font = { italic: true };
      worksheet.getRow(2).alignment = { horizontal: "center", vertical: "middle" };

      worksheet.addRow([]);
      worksheet.mergeCells(3, 1, 3, header.length);
      worksheet.getCell(3, 1).value = `Nhân viên: ${employeeName}`;
      worksheet.getRow(3).font = { italic: true };
      worksheet.getRow(3).alignment = { horizontal: "center", vertical: "middle" };

      worksheet.addRow([]);

      const headerRow = worksheet.addRow(header);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      });

      tableData.forEach((row) => {
        worksheet.addRow([
          dayjs(row.projectDate).format("DD/MM/YYYY"),
          row.isOnline,
          ...priceHeaders.map((price) => row[price] || ""),
          row.totalQuantity,
          row.totalSale
        ]);
      });

      const summaryPrices = priceHeaders.map((price) => {
        const total = data?.totalRevenue.prices.find((item) => item.price === price)?.totalQuantity;
        return total || 0;
      });

      const summaryRow = worksheet.addRow([
        "TỔNG CỘNG",
        "",
        ...summaryPrices,
        data?.totalRevenue.totalQuantity || 0,
        data?.totalRevenue.totalSale || 0
      ]);

      worksheet.mergeCells(summaryRow.number, 1, summaryRow.number, 2);
      summaryRow.font = { bold: true };
      summaryRow.getCell(1).alignment = { horizontal: "right", vertical: "middle" };

      worksheet.getColumn(1).width = 14;
      worksheet.getColumn(2).width = 12;

      priceHeaders.forEach((_, index) => {
        worksheet.getColumn(index + 3).width = 12;
      });

      worksheet.getColumn(priceHeaders.length + 3).width = 12;
      worksheet.getColumn(priceHeaders.length + 4).width = 18;

      const moneyCol = priceHeaders.length + 4;
      worksheet.getColumn(moneyCol).numFmt = '#,##0 "đ"';

      for (let row = headerRow.number + 1; row <= worksheet.lastRow!.number; row++) {
        worksheet.getCell(row, 1).alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getCell(row, 2).alignment = { horizontal: "center", vertical: "middle" };

        for (let col = 3; col <= moneyCol; col++) {
          worksheet.getCell(row, col).alignment = {
            horizontal: "right",
            vertical: "middle"
          };
        }
      }

      for (let row = headerRow.number; row <= worksheet.lastRow!.number; row++) {
        for (let col = 1; col <= header.length; col++) {
          worksheet.getCell(row, col).border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" }
          };
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const result = await saveExcelFile(new Uint8Array(buffer), resolvedFileName);

      if (result.canceled) {
        message.open({
          key: messageKey,
          type: "warning",
          content: "Bạn đã hủy lưu file excel"
        });
        return;
      }

      message.open({
        key: messageKey,
        type: "success",
        content: "Xuất file excel thành công"
      });
    } catch (error) {
      message.open({
        key: messageKey,
        type: "error",
        content: getApiErrorMessage(error, "Xuất excel thất bại")
      });
    }
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
