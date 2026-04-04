import { reportsApi } from "@renderer/api/reportsApi";
import {
  ReportRevenueSharingDetailResponse,
  ReportRevenueSharingProps,
  RevenueSharingDetailPlanScreen,
  RevenueSharingDetailPriceItem,
  RevenueSharingDetailSummaryItem,
  RevenueSharingWeekItem
} from "@shared/types";
import { saveExcelFile } from "@renderer/lib/saveFile";
import dayjs from "dayjs";
import ExcelJS from "exceljs";
import type { SaveFileResult } from "@renderer/lib/saveFile";

const moneyFormat = "#,##0";
const percentFormat = "0%";
const invalidExcelSheetChars = new Set([":", "\\", "/", "?", "*", "[", "]"]);
const invalidFileNameChars = new Set(["<", ">", ":", '"', "/", "\\", "|", "?", "*"]);

const sanitizeWorksheetName = (value: string) => {
  const sanitized = Array.from(value)
    .map((char) => (invalidExcelSheetChars.has(char) ? " " : char))
    .join("")
    .trim();
  return (sanitized || "Revenue Sharing").slice(0, 31);
};

const sanitizeFileName = (value: string) => {
  return Array.from(value)
    .map((char) => {
      const code = char.charCodeAt(0);
      if (invalidFileNameChars.has(char) || code < 32) {
        return " ";
      }

      return char;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
};

const toNumber = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const safeDate = (value?: string | null, format = "DD/MM/YYYY") => {
  if (!value) {
    return "";
  }

  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format(format) : "";
};

const getPriceMap = (prices?: RevenueSharingDetailPriceItem[] | null) => {
  return (prices ?? []).reduce<Record<number, number>>((acc, item) => {
    acc[toNumber(item.price)] = toNumber(item.totalQuantity);
    return acc;
  }, {});
};

const getSafeSummary = (summary?: RevenueSharingDetailSummaryItem | null) => {
  return {
    totalQuantity: toNumber(summary?.totalQuantity),
    totalInvitationQuantity: toNumber(summary?.totalInvitationQuantity),
    totalContractQuantity: toNumber(summary?.totalContractQuantity),
    totalSale: toNumber(summary?.totalSale),
    actualSale: toNumber(summary?.actualSale),
    prices: summary?.prices ?? []
  };
};

const createSummaryRow = (
  label: string,
  summary: RevenueSharingDetailSummaryItem | null | undefined,
  priceHeaders: number[]
) => {
  const safeSummary = getSafeSummary(summary);
  const priceMap = getPriceMap(safeSummary.prices);

  return [
    "",
    "",
    "",
    "",
    label,
    ...priceHeaders.map((price) => priceMap[price] ?? ""),
    safeSummary.totalQuantity,
    safeSummary.totalInvitationQuantity,
    safeSummary.totalContractQuantity,
    safeSummary.totalSale,
    safeSummary.actualSale
  ];
};

const applyThinBorder = (
  ws: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number
) => {
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      ws.getCell(row, col).border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" }
      };
    }
  }
};

const getPriceHeaders = (data: ReportRevenueSharingDetailResponse) => {
  const explicitHeaders = (data.detail?.priceHeaders ?? [])
    .map((item) => toNumber(item))
    .filter((item) => item > 0);

  if (explicitHeaders.length) {
    return [...new Set(explicitHeaders)].sort((a, b) => b - a);
  }

  const pricesFromPlans = (data.detail?.planScreens ?? []).flatMap((item) =>
    (item.prices ?? []).map((price) => toNumber(price.price))
  );

  return [...new Set(pricesFromPlans.filter((item) => item > 0))].sort((a, b) => b - a);
};

const getFileName = (data: ReportRevenueSharingDetailResponse) => {
  const monthSource =
    data.revenueSharingWeeks?.[0]?.startDate ??
    data.detail?.planScreens?.[0]?.projectDate ??
    data.premieredDate;
  const monthLabel =
    monthSource && dayjs(monthSource).isValid()
      ? dayjs(monthSource).format("MM.YYYY")
      : dayjs().format("MM.YYYY");

  return sanitizeFileName(`${data.filmName || "Revenue Sharing"} Tháng ${monthLabel}.xlsx`);
};

const addPlanScreenRows = (
  ws: ExcelJS.Worksheet,
  planScreens: RevenueSharingDetailPlanScreen[],
  priceHeaders: number[]
) => {
  planScreens.forEach((item) => {
    const priceMap = getPriceMap(item.prices);

    ws.addRow([
      "",
      safeDate(item.projectDate, "DD-MM"),
      item.projectTime ?? "",
      item.roomName ?? "",
      item.isOnline ? "On" : "Off",
      ...priceHeaders.map((price) => priceMap[price] ?? ""),
      toNumber(item.totalQuantity),
      toNumber(item.totalInvitationQuantity),
      toNumber(item.totalContractQuantity),
      toNumber(item.totalSale),
      toNumber(item.actualSale)
    ]);
  });
};

const addWeekRows = (ws: ExcelJS.Worksheet, weeks: RevenueSharingWeekItem[]) => {
  weeks.forEach((item) => {
    const sharingRate = toNumber(item.sharingRate);

    ws.addRow([
      item.weekLabel ?? "",
      safeDate(item.startDate),
      safeDate(item.endDate),
      toNumber(item.totalQuantity),
      toNumber(item.contractQuantity),
      toNumber(item.totalSale),
      toNumber(item.contractSale),
      sharingRate,
      toNumber(item.sharedRevenue)
    ]);

    (item.cancellations ?? []).forEach((cancellation) => {
      ws.addRow([
        `Hủy vé ${safeDate(cancellation.date, "DD/MM")}`,
        "",
        "",
        toNumber(cancellation.quantity),
        "",
        toNumber(cancellation.totalValue),
        "",
        sharingRate,
        toNumber(cancellation.totalValue) * sharingRate
      ]);
    });
  });
};

export const exportRevenueSharingExcel = async (
  record: Pick<ReportRevenueSharingProps, "filmId" | "manufacturerId"> & {
    fromDate?: string;
    toDate?: string;
  }
): Promise<SaveFileResult> => {
  const data = await reportsApi.getReportRevenueSharingDetails({
    filmId: record.filmId,
    manufacturerId: record.manufacturerId,
    fromDate: record.fromDate,
    toDate: record.toDate
  });

  const wb = new ExcelJS.Workbook();
  const worksheetName = sanitizeWorksheetName(data.filmName || `Film ${record.filmId}`);
  const ws = wb.addWorksheet(worksheetName);
  const priceHeaders = getPriceHeaders(data);
  const planScreens = data.detail?.planScreens ?? [];
  const revenueSharingWeeks = data.revenueSharingWeeks ?? [];
  const previousMonthSummary = data.previousMonthSummary;

  const headerGroupRow = 3;
  const headerRow = 4;
  const priceStartCol = 6;
  const priceEndCol = priceStartCol + Math.max(priceHeaders.length - 1, 0);
  const totalStartCol = priceEndCol + 1;
  const totalColumns = totalStartCol + 4;
  const monthSource =
    revenueSharingWeeks[0]?.startDate ?? planScreens[0]?.projectDate ?? data.premieredDate;
  const monthTitle =
    monthSource && dayjs(monthSource).isValid()
      ? dayjs(monthSource).format("MM/YYYY")
      : dayjs().format("MM/YYYY");

  ws.mergeCells(1, 1, 1, totalColumns);
  ws.getCell(1, 1).value = `DOANH THU THÁNG ${monthTitle}`;
  ws.getRow(1).font = { bold: true, size: 16 };
  ws.getRow(1).alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells(2, 1, 2, totalColumns);
  ws.getCell(2, 1).value =
    `PHIM: ${data.filmName || ""} - ${data.versionCode || ""} - HÃNG ${data.manufacturerName || ""}`;
  ws.getRow(2).font = { bold: true, size: 13 };
  ws.getRow(2).alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells(headerGroupRow, 1, headerRow, 1);
  ws.getCell(headerGroupRow, 1).value = "Phim";

  ws.mergeCells(headerGroupRow, 2, headerGroupRow, 5);
  ws.getCell(headerGroupRow, 2).value = "Nội dung chi tiết";

  ws.mergeCells(headerGroupRow, priceStartCol, headerGroupRow, priceEndCol);
  ws.getCell(headerGroupRow, priceStartCol).value = "Loại vé (đơn vị tính : 1000 đồng)";

  const totalHeaders = ["Tổng", "Giấy mời", "Hợp đồng", "Thành tiền", "Thực nộp"];
  totalHeaders.forEach((title, index) => {
    const col = totalStartCol + index;
    ws.mergeCells(headerGroupRow, col, headerRow, col);
    ws.getCell(headerGroupRow, col).value = title;
  });

  ws.getCell(headerRow, 2).value = "Ngày";
  ws.getCell(headerRow, 3).value = "Giờ";
  ws.getCell(headerRow, 4).value = "Phòng";
  ws.getCell(headerRow, 5).value = "Loại";

  priceHeaders.forEach((price, index) => {
    ws.getCell(headerRow, priceStartCol + index).value = price / 1000;
  });

  [headerGroupRow, headerRow].forEach((rowIndex) => {
    ws.getRow(rowIndex).font = { bold: true };
    ws.getRow(rowIndex).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true
    };
    ws.getRow(rowIndex).height = 24;
  });

  ws.addRow(createSummaryRow("Tổng", data.detail?.totalRevenue, priceHeaders));
  ws.addRow(createSummaryRow("Off", data.detail?.totalRevenueOffline, priceHeaders));
  ws.addRow(createSummaryRow("On", data.detail?.totalRevenueOnline, priceHeaders));
  addPlanScreenRows(ws, planScreens, priceHeaders);

  const bodyStartRow = headerRow + 1;
  const bodyEndRow = ws.lastRow!.number;

  if (bodyEndRow >= bodyStartRow) {
    ws.mergeCells(bodyStartRow, 1, bodyEndRow, 1);
    ws.getCell(bodyStartRow, 1).value =
      `${data.filmName || ""}${data.versionCode ? ` - ${data.versionCode}` : ""}`;
    ws.getCell(bodyStartRow, 1).alignment = {
      horizontal: "left",
      vertical: "middle",
      wrapText: true
    };
  }

  const weekTitleRow = ws.lastRow!.number + 2;
  ws.mergeCells(weekTitleRow, 1, weekTitleRow, 9);
  ws.getCell(weekTitleRow, 1).value = "TỔNG HỢP CHIA DOANH THU";
  ws.getRow(weekTitleRow).font = { bold: true, size: 13 };
  ws.getRow(weekTitleRow).alignment = { horizontal: "left", vertical: "middle" };

  const previousSummaryRow = weekTitleRow + 1;
  ws.mergeCells(previousSummaryRow, 1, previousSummaryRow, 9);
  ws.getCell(previousSummaryRow, 1).value = previousMonthSummary?.monthLabel
    ? `Tháng trước ${previousMonthSummary.monthLabel}: ${toNumber(
        previousMonthSummary.totalTickets
      ).toLocaleString("vi-VN")} vé - ${toNumber(previousMonthSummary.totalRevenue).toLocaleString(
        "vi-VN"
      )} đồng`
    : "Tháng trước: chưa có dữ liệu";
  ws.getRow(previousSummaryRow).font = { italic: true };

  const weekHeaders = [
    "Kỳ",
    "Từ ngày",
    "Đến ngày",
    "Số vé",
    "Vé HĐ",
    "Doanh thu",
    "Doanh thu HĐ",
    "Tỷ lệ",
    "Chia chủ phim"
  ];

  ws.addRow(weekHeaders);
  const weekHeaderRow = ws.lastRow!.number;
  const weekDataStartRow = weekHeaderRow + 1;

  addWeekRows(ws, revenueSharingWeeks);

  if (!revenueSharingWeeks.length) {
    ws.addRow(["Chưa có dữ liệu", "", "", "", "", "", "", "", ""]);
  }

  const weekDataEndRow = ws.lastRow!.number;
  ws.addRow([
    "Cộng",
    "",
    "",
    { formula: `SUM(D${weekDataStartRow}:D${weekDataEndRow})` },
    { formula: `SUM(E${weekDataStartRow}:E${weekDataEndRow})` },
    { formula: `SUM(F${weekDataStartRow}:F${weekDataEndRow})` },
    { formula: `SUM(G${weekDataStartRow}:G${weekDataEndRow})` },
    "",
    { formula: `SUM(I${weekDataStartRow}:I${weekDataEndRow})` }
  ]);

  const weekTableEndRow = ws.lastRow!.number;

  ws.columns.forEach((col) => {
    col.width = 12;
  });

  ws.getColumn(1).width = 28;
  ws.getColumn(2).width = 10;
  ws.getColumn(3).width = 10;
  ws.getColumn(4).width = 10;
  ws.getColumn(5).width = 12;

  for (let row = bodyStartRow; row <= bodyEndRow; row++) {
    for (let col = 2; col <= totalColumns; col++) {
      if (col >= priceStartCol) {
        ws.getCell(row, col).numFmt = moneyFormat;
      }

      ws.getCell(row, col).alignment = {
        horizontal: col >= priceStartCol ? "right" : "center",
        vertical: "middle"
      };
    }
  }

  for (let row = weekHeaderRow; row <= weekTableEndRow; row++) {
    for (let col = 1; col <= 9; col++) {
      if (row > weekHeaderRow && col >= 4 && col <= 7) {
        ws.getCell(row, col).numFmt = moneyFormat;
      }
      if (row > weekHeaderRow && col === 8) {
        ws.getCell(row, col).numFmt = percentFormat;
      }
      if (row > weekHeaderRow && col === 9) {
        ws.getCell(row, col).numFmt = moneyFormat;
      }

      ws.getCell(row, col).alignment = {
        horizontal: col >= 4 ? "right" : "center",
        vertical: "middle",
        wrapText: true
      };
    }
  }

  ws.getRow(bodyStartRow).font = { bold: true };
  ws.getRow(bodyStartRow + 1).font = { bold: true };
  ws.getRow(bodyStartRow + 2).font = { bold: true };
  ws.getRow(weekHeaderRow).font = { bold: true };
  ws.getRow(weekTableEndRow).font = { bold: true };

  applyThinBorder(ws, headerGroupRow, bodyEndRow, 1, totalColumns);
  applyThinBorder(ws, weekHeaderRow, weekTableEndRow, 1, 9);

  ws.views = [
    {
      state: "frozen",
      ySplit: headerRow,
      xSplit: 1
    }
  ];

  const buf = await wb.xlsx.writeBuffer();
  return saveExcelFile(new Uint8Array(buf), getFileName(data));
};

const ExportButton = () => null;

export default ExportButton;
