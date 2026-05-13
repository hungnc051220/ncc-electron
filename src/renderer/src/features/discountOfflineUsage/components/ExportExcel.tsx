import Icon from "@ant-design/icons";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { saveExcelFile } from "@renderer/lib/saveFile";
import { useAntdApp } from "@renderer/hooks/useAntdApp";
import { usePermission } from "@renderer/permissions/usePermission";
import type { DiscountOfflineUsageReportItem } from "@shared/types";
import { Button } from "antd";
import dayjs from "dayjs";
import ExcelJS from "exceljs";
import { DownloadIcon } from "lucide-react";

type ExportExcelProps = {
  tableData: DiscountOfflineUsageReportItem[];
  dateRange?: [string, string];
  loading?: boolean;
};

type SummaryTotals = {
  countOrder: number;
  countQuantity: number;
  countDiscountAmount: number;
  countPriceInclTax: number;
};

const REPORT_TITLE = "Báo cáo doanh thu các chương trình khuyến mãi, giảm giá";
const numberFormat = "#,##0";
const invalidFileNameChars = new Set(["<", ">", ":", '"', "/", "\\", "|", "?", "*"]);

const sanitizeFileName = (value: string) =>
  Array.from(value)
    .map((char) => {
      const code = char.charCodeAt(0);
      return invalidFileNameChars.has(char) || code < 32 ? " " : char;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();

const buildSummary = (tableData: DiscountOfflineUsageReportItem[]) =>
  tableData.reduce<SummaryTotals>(
    (total, item) => ({
      countOrder: total.countOrder + (item.totalOrders || 0),
      countQuantity: total.countQuantity + (item.totalQuantity || 0),
      countDiscountAmount: total.countDiscountAmount + (item.totalDiscountAmount || 0),
      countPriceInclTax: total.countPriceInclTax + (item.totalPriceInclTax || 0)
    }),
    {
      countOrder: 0,
      countQuantity: 0,
      countDiscountAmount: 0,
      countPriceInclTax: 0
    }
  );

const applyThinBorder = (
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number
) => {
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      worksheet.getCell(row, col).border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" }
      };
    }
  }
};

const ExportExcelButton = ({ tableData, dateRange, loading }: ExportExcelProps) => {
  const { message } = useAntdApp();
  const { can } = usePermission();
  const canExport = can("discount_offline_usage", "export");

  if (!canExport) {
    return null;
  }

  const exportExcel = async () => {
    const messageKey = "export-discount-offline-usage";

    message.open({
      key: messageKey,
      type: "loading",
      content: "Đang xuất file excel...",
      duration: 0
    });

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Chi tiet");
      const headers = [
        "STT",
        "Khuyến mại, giảm giá",
        "Số đơn áp dụng",
        "Số vé áp dụng",
        "Tổng tiền khuyến mại, giảm giá",
        "Tổng doanh thu"
      ];
      const totalColumns = headers.length;
      const fromDate = dateRange?.[0] ? dayjs(dateRange[0]) : null;
      const toDate = dateRange?.[1] ? dayjs(dateRange[1]) : null;
      const hasDateRange = !!fromDate?.isValid() && !!toDate?.isValid();
      const resolvedFileName = sanitizeFileName(
        hasDateRange
          ? `${REPORT_TITLE} ${fromDate!.format("DD-MM-YYYY")}-${toDate!.format("DD-MM-YYYY")}.xlsx`
          : `${REPORT_TITLE}.xlsx`
      );

      worksheet.mergeCells(1, 1, 1, totalColumns);
      worksheet.getCell(1, 1).value = REPORT_TITLE.toUpperCase();
      worksheet.getRow(1).font = { bold: true, size: 16 };
      worksheet.getRow(1).alignment = { horizontal: "center", vertical: "middle" };

      worksheet.mergeCells(2, 1, 2, totalColumns);
      worksheet.getCell(2, 1).value = hasDateRange
        ? `Từ ngày: ${fromDate!.format("DD/MM/YYYY")} - Đến ngày: ${toDate!.format("DD/MM/YYYY")}`
        : "";
      worksheet.getRow(2).font = { italic: true };
      worksheet.getRow(2).alignment = { horizontal: "center", vertical: "middle" };

      worksheet.addRow([]);
      const headerRow = worksheet.addRow(headers);
      headerRow.font = { bold: true };
      headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      headerRow.height = 28;

      tableData.forEach((item, index) => {
        worksheet.addRow([
          index + 1,
          item.discountName || "",
          item.totalOrders || 0,
          item.totalQuantity || 0,
          item.totalDiscountAmount || 0,
          item.totalPriceInclTax || 0
        ]);
      });

      const summary = buildSummary(tableData);
      const summaryRow = worksheet.addRow([
        "Tổng",
        "",
        summary.countOrder,
        summary.countQuantity,
        summary.countDiscountAmount,
        summary.countPriceInclTax
      ]);
      worksheet.mergeCells(summaryRow.number, 1, summaryRow.number, 2);
      summaryRow.font = { bold: true };

      worksheet.columns = [
        { width: 8 },
        { width: 42 },
        { width: 18 },
        { width: 18 },
        { width: 22 },
        { width: 22 }
      ];

      const startRow = headerRow.number;
      const endRow = worksheet.lastRow?.number || headerRow.number;

      for (let row = startRow + 1; row <= endRow; row++) {
        worksheet.getCell(row, 1).alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getCell(row, 2).alignment = { horizontal: "left", vertical: "middle" };

        for (let col = 3; col <= totalColumns; col++) {
          worksheet.getCell(row, col).alignment = { horizontal: "right", vertical: "middle" };
          worksheet.getCell(row, col).numFmt = numberFormat;
        }
      }

      worksheet.getCell(summaryRow.number, 1).alignment = {
        horizontal: "center",
        vertical: "middle"
      };

      applyThinBorder(worksheet, startRow, endRow, 1, totalColumns);

      worksheet.views = [
        {
          state: "frozen",
          ySplit: headerRow.number
        }
      ];

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
      disabled={loading || tableData.length === 0}
      onClick={() => void exportExcel()}
      icon={<Icon component={DownloadIcon} />}
    >
      Xuất excel
    </Button>
  );
};

export default ExportExcelButton;
