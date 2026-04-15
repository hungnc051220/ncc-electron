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

type RevenueSummary = {
  totalQuantity?: number | null;
  totalSale?: number | null;
  prices?: Array<{
    price: number;
    totalQuantity: number;
  }> | null;
};

const getCellTextLength = (cell: ExcelJS.Cell) => {
  const value = cell.value;

  if (value == null) return 0;
  if (typeof value === "string") return value.length;
  if (typeof value === "number") return value.toLocaleString("en-US").length;
  if (typeof value === "boolean") return value ? 4 : 5;
  if (value instanceof Date) return 10;

  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.reduce((total, part) => total + (part.text?.length || 0), 0);
    }

    if ("text" in value && typeof value.text === "string") {
      return value.text.length;
    }

    if (
      "result" in value &&
      (typeof value.result === "string" || typeof value.result === "number")
    ) {
      return String(value.result).length;
    }
  }

  return String(value).length;
};

const autoFitWorksheetColumns = (
  worksheet: ExcelJS.Worksheet,
  options?: {
    minWidth?: number;
    maxWidth?: number;
    extraWidth?: number;
    fixedWidths?: Record<number, number>;
    headerTexts?: Record<number, string>;
    startRow?: number;
    endRow?: number;
  }
) => {
  const minWidth = options?.minWidth ?? 8;
  const maxWidth = options?.maxWidth ?? 40;
  const extraWidth = options?.extraWidth ?? 2;
  const fixedWidths = options?.fixedWidths ?? {};
  const headerTexts = options?.headerTexts ?? {};
  const startRow = options?.startRow ?? 1;
  const endRow = options?.endRow ?? worksheet.rowCount;

  worksheet.columns.forEach((column, index) => {
    const columnNumber = index + 1;

    if (fixedWidths[columnNumber]) {
      column.width = fixedWidths[columnNumber];
      return;
    }

    let maxLength = headerTexts[columnNumber]?.length ?? 0;

    for (let rowNumber = startRow; rowNumber <= endRow; rowNumber++) {
      const cell = worksheet.getRow(rowNumber).getCell(columnNumber);

      if (cell.isMerged) {
        continue;
      }

      maxLength = Math.max(maxLength, getCellTextLength(cell));
    }

    column.width = Math.min(maxWidth, Math.max(minWidth, maxLength + extraWidth));
  });
};

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

    if (!data) {
      return;
    }

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
      const detailHeaders = [
        "Ngày",
        "Loại",
        ...priceHeaders.map((price) => (price / 1000).toString()),
        "Tổng vé",
        "Doanh thu"
      ];
      const totalColumns = detailHeaders.length;
      const priceStartCol = 3;
      const priceEndCol = priceStartCol + priceHeaders.length - 1;
      const totalQuantityCol = priceEndCol + 1;
      const totalSaleCol = priceEndCol + 2;
      const moneyFormat = '#,##0 "đ"';
      const countFormat = "#,##0";
      const summaryRows = [
        {
          label: "Offline",
          summary: data.totalRevenueOffline as RevenueSummary
        },
        {
          label: "Online",
          summary: data.totalRevenueOnline as RevenueSummary
        },
        {
          label: "Tổng cộng",
          summary: data.totalRevenue as RevenueSummary
        }
      ];
      const headerTexts: Record<number, string> = {
        1: "Ngày",
        2: "Loại",
        [totalQuantityCol]: "Tổng vé",
        [totalSaleCol]: "Doanh thu"
      };

      priceHeaders.forEach((price, index) => {
        headerTexts[priceStartCol + index] = (price / 1000).toString();
      });

      worksheet.addRow([]);
      worksheet.getCell(1, 1).value = REPORT_TITLE.toUpperCase();
      worksheet.mergeCells(1, 1, 1, totalColumns);
      worksheet.getRow(1).font = { bold: true, size: 16 };
      worksheet.getRow(1).alignment = { horizontal: "center", vertical: "middle" };

      worksheet.addRow([]);
      worksheet.mergeCells(2, 1, 2, totalColumns);
      worksheet.getCell(2, 1).value = `Tháng: ${monthLabel}`;
      worksheet.getRow(2).font = { italic: true };
      worksheet.getRow(2).alignment = { horizontal: "center", vertical: "middle" };

      worksheet.addRow([]);
      worksheet.mergeCells(3, 1, 3, totalColumns);
      worksheet.getCell(3, 1).value = `Nhân viên: ${employeeName}`;
      worksheet.getRow(3).font = { italic: true };
      worksheet.getRow(3).alignment = { horizontal: "center", vertical: "middle" };

      worksheet.addRow([]);

      const headerGroupRowIndex = worksheet.lastRow!.number + 1;
      const headerDetailRowIndex = headerGroupRowIndex + 1;

      worksheet.getRow(headerGroupRowIndex);
      worksheet.getRow(headerDetailRowIndex);

      worksheet.mergeCells(headerGroupRowIndex, 1, headerDetailRowIndex, 1);
      worksheet.getCell(headerGroupRowIndex, 1).value = "Ngày";

      worksheet.mergeCells(headerGroupRowIndex, 2, headerDetailRowIndex, 2);
      worksheet.getCell(headerGroupRowIndex, 2).value = "Loại";

      if (priceHeaders.length > 0) {
        worksheet.mergeCells(headerGroupRowIndex, priceStartCol, headerGroupRowIndex, priceEndCol);
        worksheet.getCell(headerGroupRowIndex, priceStartCol).value =
          "Loại giá vé (Đơn vị tính: 1000 đồng)";
      }

      worksheet.mergeCells(headerGroupRowIndex, totalQuantityCol, headerDetailRowIndex, totalQuantityCol);
      worksheet.getCell(headerGroupRowIndex, totalQuantityCol).value = "Tổng vé";

      worksheet.mergeCells(headerGroupRowIndex, totalSaleCol, headerDetailRowIndex, totalSaleCol);
      worksheet.getCell(headerGroupRowIndex, totalSaleCol).value = "Doanh thu";

      priceHeaders.forEach((price, index) => {
        worksheet.getCell(headerDetailRowIndex, priceStartCol + index).value = (price / 1000).toString();
      });

      [headerGroupRowIndex, headerDetailRowIndex].forEach((rowNumber) => {
        const row = worksheet.getRow(rowNumber);
        row.font = { bold: true };
        row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        row.height = 24;
      });

      tableData.forEach((row) => {
        worksheet.addRow([
          dayjs(row.projectDate).format("DD/MM/YYYY"),
          row.isOnline,
          ...priceHeaders.map((price) => Number(row[price] || 0)),
          row.totalQuantity,
          row.totalSale
        ]);
      });

      summaryRows.forEach(({ label, summary }) => {
        const summaryPriceMap = new Map(
          (summary.prices ?? []).map((item) => [item.price, item.totalQuantity])
        );
        const summaryRow = worksheet.addRow([
          label,
          "",
          ...priceHeaders.map((price) => summaryPriceMap.get(price) ?? 0),
          summary.totalQuantity ?? 0,
          summary.totalSale ?? 0
        ]);

        worksheet.mergeCells(summaryRow.number, 1, summaryRow.number, 2);
        summaryRow.font = { bold: true };
        summaryRow.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE6F4EA" }
          };
        });
        summaryRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
      });

      const dataStartRow = headerDetailRowIndex + 1;
      const lastRowNumber = worksheet.lastRow!.number;

      const countCols = [
        ...priceHeaders.map((_, index) => priceStartCol + index),
        totalQuantityCol
      ];

      countCols.forEach((col) => {
        worksheet.getColumn(col).numFmt = countFormat;
      });
      worksheet.getColumn(totalSaleCol).numFmt = moneyFormat;

      for (let row = dataStartRow; row <= lastRowNumber; row++) {
        worksheet.getCell(row, 1).alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getCell(row, 2).alignment = { horizontal: "center", vertical: "middle" };

        for (let col = priceStartCol; col <= totalSaleCol; col++) {
          worksheet.getCell(row, col).alignment = {
            horizontal: "right",
            vertical: "middle"
          };
        }
      }

      for (let row = headerGroupRowIndex; row <= lastRowNumber; row++) {
        for (let col = 1; col <= totalColumns; col++) {
          worksheet.getCell(row, col).border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" }
          };
        }
      }

      autoFitWorksheetColumns(worksheet, {
        minWidth: 6,
        maxWidth: 18,
        extraWidth: 1,
        fixedWidths: {
          1: 14,
          2: 12
        },
        headerTexts,
        startRow: headerDetailRowIndex,
        endRow: lastRowNumber
      });

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
