import Icon from "@ant-design/icons";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { saveExcelFile } from "@renderer/lib/saveFile";
import { usePermission } from "@renderer/permissions/usePermission";
import { Button, message } from "antd";
import ExcelJS from "exceljs";
import { DownloadIcon } from "lucide-react";
import dayjs from "dayjs";
import { RevenueColumnMode, getActualRemittance, getTotalTicketAndContract } from ".";

type Row = {
  filmName: string;
  projectDate: string;
  projectTime: string;
  roomName: string;
  isOnline: boolean;
  pricesMap: Record<number, number>;
  filmRowSpan?: number;
  dateRowSpan?: number;
  onlineRowSpan?: number;
  totalInvitationQuantity: number;
  totalContractQuantity: number;
  totalQuantity: number;
  totalSale: number;
  saleVnPayQr: number;
  saleVietQr: number;
  actualSale: number;
  discountOffline: number;
  discountOnline: number;
  discountPartner: number;
  discountTotal: number;
  internalDiscountTotal: number;
};

type FilmGroup = {
  filmName: string;
  pricesMap: Record<number, number>;
  totalInvitationQuantity: number;
  totalContractQuantity: number;
  totalQuantity: number;
  totalSale: number;
  saleVnPayQr: number;
  saleVietQr: number;
  actualSale: number;
  discountOffline: number;
  discountOnline: number;
  discountPartner: number;
  discountTotal: number;
  internalDiscountTotal: number;
  rows: Row[];
};

type SummaryGroup = {
  off: Row[];
  on: Row[];
};

type Props = {
  tableData: Row[];
  allPrices: number[];
  summaryByDate: Record<string, SummaryGroup>;
  totalPlanCount?: number;
  fromDate: string;
  toDate: string;
  dateType: number;
  employeeName?: string;
  manufacturerName?: string;
  fileName?: string;
  columnMode: RevenueColumnMode;
};

const getReportTitleByDateType = (dateType: number) =>
  dateType === 2
    ? "Báo cáo doanh thu phim theo ngày bán"
    : "Báo cáo doanh thu phim theo lịch chiếu";

const sumRows = (rows: Row[]) => {
  const prices: Record<number, number> = {};
  let totalPlanScreen = 0;
  let totalQuantity = 0;
  let totalInvitationQuantity = 0;
  let totalContractQuantity = 0;
  let totalSale = 0;
  let saleVnPayQr = 0;
  let saleVietQr = 0;
  let actualSale = 0;
  let discountOffline = 0;
  let discountOnline = 0;
  let discountPartner = 0;
  let discountTotal = 0;
  let internalDiscountTotal = 0;

  rows.forEach((r) => {
    totalPlanScreen += 1;
    totalQuantity += r.totalQuantity;
    totalInvitationQuantity += r.totalInvitationQuantity;
    totalContractQuantity += r.totalContractQuantity;
    totalSale += r.totalSale;
    saleVnPayQr += r.saleVnPayQr;
    saleVietQr += r.saleVietQr;
    actualSale += r.actualSale;
    discountOffline += r.discountOffline;
    discountOnline += r.discountOnline;
    discountPartner += r.discountPartner;
    discountTotal += r.discountTotal;
    internalDiscountTotal += r.internalDiscountTotal;

    Object.entries(r.pricesMap).forEach(([price, quantity]) => {
      const numericPrice = Number(price);
      prices[numericPrice] = (prices[numericPrice] ?? 0) + quantity;
    });
  });

  return {
    prices,
    totalPlanScreen,
    totalQuantity,
    totalInvitationQuantity,
    totalContractQuantity,
    totalSale,
    saleVnPayQr,
    saleVietQr,
    actualSale,
    discountOffline,
    discountOnline,
    discountPartner,
    discountTotal,
    internalDiscountTotal
  };
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
    maxWidths?: Record<number, number>;
    extraWidth?: number;
    fixedWidths?: Record<number, number>;
    headerTexts?: Record<number, string>;
    startRow?: number;
    endRow?: number;
  }
) => {
  const minWidth = options?.minWidth ?? 8;
  const maxWidth = options?.maxWidth ?? 40;
  const maxWidths = options?.maxWidths ?? {};
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

      // Bo qua o merge de tranh group header/title lam cot bi nong qua muc
      if (cell.isMerged) {
        continue;
      }

      maxLength = Math.max(maxLength, getCellTextLength(cell));
    }

    const effectiveMaxWidth = maxWidths[columnNumber] ?? maxWidth;

    column.width = Math.min(effectiveMaxWidth, Math.max(minWidth, maxLength + extraWidth));
  });
};

const ExportRevenueExcelButton = ({
  tableData,
  allPrices,
  summaryByDate,
  totalPlanCount,
  fromDate,
  toDate,
  dateType,
  employeeName,
  manufacturerName,
  fileName,
  columnMode
}: Props) => {
  const { can } = usePermission();
  const canExport = can("staff_revenue_report", "export");
  const isDisabled = tableData.length === 0 || allPrices.length === 0;

  if (!canExport) {
    return null;
  }

  const buildFilmGroups = (rows: Row[]): FilmGroup[] => {
    const groups = rows.reduce<Record<string, FilmGroup>>((acc, row) => {
      if (!acc[row.filmName]) {
        acc[row.filmName] = {
          filmName: row.filmName,
          pricesMap: {},
          totalInvitationQuantity: 0,
          totalContractQuantity: 0,
          totalQuantity: 0,
          totalSale: 0,
          saleVnPayQr: 0,
          saleVietQr: 0,
          actualSale: 0,
          discountOffline: 0,
          discountOnline: 0,
          discountPartner: 0,
          discountTotal: 0,
          internalDiscountTotal: 0,
          rows: []
        };
      }

      const target = acc[row.filmName];
      target.rows.push(row);
      target.totalInvitationQuantity += row.totalInvitationQuantity;
      target.totalContractQuantity += row.totalContractQuantity;
      target.totalQuantity += row.totalQuantity;
      target.totalSale += row.totalSale;
      target.saleVnPayQr += row.saleVnPayQr;
      target.saleVietQr += row.saleVietQr;
      target.actualSale += row.actualSale;
      target.discountOffline += row.discountOffline;
      target.discountOnline += row.discountOnline;
      target.discountPartner += row.discountPartner;
      target.discountTotal += row.discountTotal;
      target.internalDiscountTotal += row.internalDiscountTotal;

      Object.entries(row.pricesMap).forEach(([price, quantity]) => {
        const numericPrice = Number(price);
        target.pricesMap[numericPrice] = (target.pricesMap[numericPrice] ?? 0) + quantity;
      });

      return acc;
    }, {});

    return Object.values(groups);
  };

  const exportExcel = async () => {
    const messageKey = `export-staff-revenue-by-film-${dateType}`;

    message.open({
      key: messageKey,
      type: "loading",
      content: "Đang xuất file excel...",
      duration: 0
    });

    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Chi tiết");
      const reportTitle = getReportTitleByDateType(dateType);
      const formattedFromDate = dayjs(fromDate).format("DD/MM/YYYY");
      const formattedToDate = dayjs(toDate).format("DD/MM/YYYY");
      const filmGroups = buildFilmGroups(tableData);
      const offlineRows = Object.values(summaryByDate).flatMap((group) => group.off);
      const onlineRows = Object.values(summaryByDate).flatMap((group) => group.on);
      const totalRows = [...offlineRows, ...onlineRows];
      const detailSummaryRows = [
        { label: "Offline", sum: sumRows(offlineRows) },
        { label: "Online", sum: sumRows(onlineRows) },
        { label: "Tổng cộng", sum: sumRows(totalRows) }
      ];
      const subtitleLines = [
        `Từ ngày: ${formattedFromDate}  -  Đến ngày: ${formattedToDate}`,
        employeeName ? `Nhân viên: ${employeeName}` : null,
        manufacturerName ? `Hãng phim: ${manufacturerName}` : null
      ].filter((line): line is string => !!line);
      const resolvedFileName =
        fileName ??
        `${reportTitle} ${dayjs(fromDate).format("DD.MM.YYYY")}-${dayjs(toDate).format("DD.MM.YYYY")}.xlsx`;
      const showDiscountColumns = columnMode !== "manufacturer";
      const showActualRemittance = columnMode === "user";
      const lastRevenueColumnTitle = showActualRemittance ? "Thực nộp" : "Tổng doanh thu sau KM";
      const userRevenueHeaders = showActualRemittance
        ? ["VNPayQR", "VietQR", lastRevenueColumnTitle]
        : [lastRevenueColumnTitle];

      const header = [
        "Phim",
        "Ngày",
        "Giờ",
        "Ph",
        "Loại",
        ...allPrices.map((p) => (p / 1000).toString()),
        "+",
        "GM",
        "HĐ",
        "Vé bán + HĐ",
        "Tổng doanh thu",
        ...(showDiscountColumns ? ["KM", "Giảm giá", ...userRevenueHeaders] : [])
      ];

      const totalColumns = header.length;

      // ===== TITLE =====
      ws.addRow([]);
      ws.getCell(1, 1).value = reportTitle.toUpperCase();
      ws.mergeCells(1, 1, 1, totalColumns);
      ws.getRow(1).font = { bold: true, size: 16 };
      ws.getRow(1).alignment = { horizontal: "center" };

      subtitleLines.forEach((line) => {
        ws.addRow([]);
        ws.mergeCells(ws.lastRow!.number, 1, ws.lastRow!.number, totalColumns);
        ws.getCell(ws.lastRow!.number, 1).value = line;
        ws.getRow(ws.lastRow!.number).alignment = {
          horizontal: "center",
          vertical: "middle"
        };
        ws.getRow(ws.lastRow!.number).font = { italic: true };
      });

      ws.addRow([]);

      // ===== HEADER GROUP ROW =====
      const headerGroupRowIndex = ws.lastRow!.number + 1;
      ws.getRow(headerGroupRowIndex);

      ws.mergeCells(headerGroupRowIndex, 1, headerGroupRowIndex + 1, 1);
      ws.getCell(headerGroupRowIndex, 1).value = "Phim";

      ws.mergeCells(headerGroupRowIndex, 2, headerGroupRowIndex, 5);
      ws.getCell(headerGroupRowIndex, 2).value = "Nội dung chi tiết";

      const priceStartCol = 6;
      const priceEndCol = 5 + allPrices.length;

      ws.mergeCells(headerGroupRowIndex, priceStartCol, headerGroupRowIndex, priceEndCol);
      ws.getCell(headerGroupRowIndex, priceStartCol).value = "Loại giá vé (Đơn vị tính: 1000 đồng)";

      const totalStartCol = priceEndCol + 1;
      const amountCol = totalStartCol + 4;

      let totalCol = totalStartCol;

      const totalHeaders = ["+", "GM", "HĐ", "Vé bán + HĐ", "Tổng doanh thu"];

      totalHeaders.forEach((title) => {
        ws.mergeCells(headerGroupRowIndex, totalCol, headerGroupRowIndex + 1, totalCol);
        ws.getCell(headerGroupRowIndex, totalCol).value = title;
        totalCol++;
      });

      const COL_AMOUNT = amountCol;
      const COL_DISCOUNT_OFFLINE = showDiscountColumns ? amountCol + 1 : undefined;
      const COL_INTERNAL_DISCOUNT = showDiscountColumns ? amountCol + 2 : undefined;
      const COL_VNPAY_QR = showActualRemittance ? amountCol + 3 : undefined;
      const COL_VIET_QR = showActualRemittance ? amountCol + 4 : undefined;
      const COL_LAST_REVENUE = showDiscountColumns
        ? showActualRemittance
          ? amountCol + 5
          : amountCol + 3
        : undefined;
      const totalEndCol = COL_LAST_REVENUE ?? COL_AMOUNT;
      const detailHeaderTexts: Record<number, string> = {
        1: "Phim",
        2: "Ngày",
        3: "Giờ",
        4: "Ph",
        5: "Loại"
      };

      const moneyFormat = "#,##0";
      const countFormat = "#,##0";

      const detailCountCols = [
        ...allPrices.map((_, index) => priceStartCol + index),
        totalStartCol,
        totalStartCol + 1,
        totalStartCol + 2,
        totalStartCol + 3
      ];

      detailCountCols.forEach((detailCol) => {
        ws.getColumn(detailCol).numFmt = countFormat;
      });

      allPrices.forEach((price, index) => {
        detailHeaderTexts[priceStartCol + index] = (price / 1000).toString();
      });

      totalHeaders.forEach((title, index) => {
        detailHeaderTexts[totalStartCol + index] = title;
      });

      [
        COL_AMOUNT,
        COL_DISCOUNT_OFFLINE,
        COL_INTERNAL_DISCOUNT,
        COL_VNPAY_QR,
        COL_VIET_QR,
        COL_LAST_REVENUE
      ]
        .filter((col): col is number => typeof col === "number")
        .forEach((col) => {
          ws.getColumn(col).numFmt = moneyFormat;
        });

      if (
        showDiscountColumns &&
        COL_DISCOUNT_OFFLINE &&
        COL_INTERNAL_DISCOUNT &&
        COL_LAST_REVENUE
      ) {
        ws.mergeCells(
          headerGroupRowIndex,
          COL_DISCOUNT_OFFLINE,
          headerGroupRowIndex + 1,
          COL_DISCOUNT_OFFLINE
        );
        ws.getCell(headerGroupRowIndex, COL_DISCOUNT_OFFLINE).value = "KM";

        ws.mergeCells(
          headerGroupRowIndex,
          COL_INTERNAL_DISCOUNT,
          headerGroupRowIndex + 1,
          COL_INTERNAL_DISCOUNT
        );
        ws.getCell(headerGroupRowIndex, COL_INTERNAL_DISCOUNT).value = "Giảm giá";

        if (showActualRemittance && COL_VNPAY_QR && COL_VIET_QR) {
          ws.mergeCells(headerGroupRowIndex, COL_VNPAY_QR, headerGroupRowIndex + 1, COL_VNPAY_QR);
          ws.getCell(headerGroupRowIndex, COL_VNPAY_QR).value = "VNPayQR";

          ws.mergeCells(headerGroupRowIndex, COL_VIET_QR, headerGroupRowIndex + 1, COL_VIET_QR);
          ws.getCell(headerGroupRowIndex, COL_VIET_QR).value = "VietQR";
        }

        ws.mergeCells(
          headerGroupRowIndex,
          COL_LAST_REVENUE,
          headerGroupRowIndex + 1,
          COL_LAST_REVENUE
        );
        ws.getCell(headerGroupRowIndex, COL_LAST_REVENUE).value = lastRevenueColumnTitle;

        detailHeaderTexts[COL_DISCOUNT_OFFLINE] = "KM";
        detailHeaderTexts[COL_INTERNAL_DISCOUNT] = "Giảm giá";

        if (showActualRemittance && COL_VNPAY_QR && COL_VIET_QR) {
          detailHeaderTexts[COL_VNPAY_QR] = "VNPayQR";
          detailHeaderTexts[COL_VIET_QR] = "VietQR";
        }

        detailHeaderTexts[COL_LAST_REVENUE] = lastRevenueColumnTitle;
      }

      const headerRowIndex = headerGroupRowIndex + 1;
      const headerRow = ws.getRow(headerRowIndex);

      let col = 2;

      headerRow.getCell(col++).value = "Ngày";
      headerRow.getCell(col++).value = "Giờ";
      headerRow.getCell(col++).value = "Ph";
      headerRow.getCell(col++).value = "Loại";

      allPrices.forEach((p) => {
        headerRow.getCell(col++).value = (p / 1000).toString();
      });

      [headerGroupRowIndex, headerRowIndex].forEach((r) => {
        ws.getRow(r).font = { bold: true };
        ws.getRow(r).alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true
        };
        ws.getRow(r).height = 28;
      });

      const detailSummaryStartRowIndex = ws.lastRow!.number + 1;

      detailSummaryRows.forEach(({ label, sum }) => {
        const row = ws.addRow([
          label,
          "",
          "",
          "",
          "",
          ...allPrices.map((p) => sum.prices[p] ?? ""),
          sum.totalQuantity,
          sum.totalInvitationQuantity,
          sum.totalContractQuantity,
          getTotalTicketAndContract(sum),
          sum.actualSale,
          ...(showDiscountColumns
            ? [
                sum.discountTotal,
                sum.internalDiscountTotal,
                ...(showActualRemittance ? [sum.saleVnPayQr, sum.saleVietQr] : []),
                showActualRemittance ? getActualRemittance(sum) : sum.actualSale - sum.discountTotal
              ]
            : [])
        ]);

        row.font = { bold: true };
        row.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE6F4EA" }
          };
        });
      });

      ws.addRow([]);

      filmGroups.forEach((film) => {
        const summaryRow = ws.addRow([
          film.filmName,
          null,
          null,
          null,
          null,
          ...allPrices.map((p) => film.pricesMap[p] ?? ""),
          film.totalQuantity,
          film.totalInvitationQuantity,
          film.totalContractQuantity,
          getTotalTicketAndContract(film),
          film.actualSale,
          ...(showDiscountColumns
            ? [
                film.discountTotal,
                film.internalDiscountTotal,
                ...(showActualRemittance ? [film.saleVnPayQr, film.saleVietQr] : []),
                showActualRemittance
                  ? getActualRemittance(film)
                  : film.actualSale - film.discountTotal
              ]
            : [])
        ]);

        ws.mergeCells(summaryRow.number, 1, summaryRow.number, 5);
        summaryRow.font = { bold: true };
        summaryRow.getCell(1).alignment = {
          horizontal: "left",
          vertical: "middle",
          wrapText: false
        };
        for (let c = 1; c <= totalEndCol; c++) {
          ws.getCell(summaryRow.number, c).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF3F4F6" }
          };
        }

        film.rows.forEach((r) => {
          ws.addRow([
            "",
            dayjs(r.projectDate).format("DD/MM"),
            r.projectTime,
            r.roomName,
            r.isOnline ? "On" : "Off",
            ...allPrices.map((p) => r.pricesMap[p] ?? ""),
            r.totalQuantity,
            r.totalInvitationQuantity,
            r.totalContractQuantity,
            getTotalTicketAndContract(r),
            r.actualSale,
            ...(showDiscountColumns
              ? [
                  r.discountTotal,
                  r.internalDiscountTotal,
                  ...(showActualRemittance ? [r.saleVnPayQr, r.saleVietQr] : []),
                  showActualRemittance ? getActualRemittance(r) : r.actualSale - r.discountTotal
                ]
              : [])
          ]);
        });
      });

      const wsSummary = wb.addWorksheet("Tổng hợp");
      const summaryHeaderGroup = [
        "Ngày",
        "Loại",
        "Tổng ca chiếu",
        ...allPrices.map((_, index) => (index === 0 ? "Loại giá vé (Đơn vị tính: 1000 đồng)" : "")),
        "Tổng",
        "GM",
        "HĐ",
        "Vé bán + HĐ",
        "Tổng doanh thu",
        ...(showDiscountColumns ? ["KM", "Giảm giá", ...userRevenueHeaders] : [])
      ];
      const summaryHeaderDetail = [
        "",
        "",
        "",
        ...allPrices.map((p) => (p / 1000).toString()),
        "",
        "",
        "",
        ...(showDiscountColumns ? ["", "", ""] : [])
      ];
      const summaryHeaderTexts: Record<number, string> = {
        1: "Ngày",
        2: "Loại",
        3: "Tổng ca chiếu"
      };

      wsSummary.addRow(summaryHeaderGroup);
      wsSummary.addRow(summaryHeaderDetail);

      const summaryHeaderGroupRow = 1;
      const summaryHeaderRow = 2;
      const summaryPriceStartCol = 4;
      const summaryPriceEndCol = summaryPriceStartCol + allPrices.length - 1;
      const summaryTotalStartCol = summaryPriceStartCol + allPrices.length;
      const summaryDiscountStartCol = showDiscountColumns ? summaryTotalStartCol + 5 : undefined;
      const summaryVnpayCol =
        showDiscountColumns && showActualRemittance && summaryDiscountStartCol
          ? summaryDiscountStartCol + 2
          : undefined;
      const summaryVietqrCol =
        showDiscountColumns && showActualRemittance && summaryDiscountStartCol
          ? summaryDiscountStartCol + 3
          : undefined;
      const summaryLastRevenueCol =
        showDiscountColumns && summaryDiscountStartCol
          ? showActualRemittance
            ? summaryDiscountStartCol + 4
            : summaryDiscountStartCol + 2
          : undefined;

      allPrices.forEach((price, index) => {
        summaryHeaderTexts[summaryPriceStartCol + index] = (price / 1000).toString();
      });

      summaryHeaderTexts[summaryTotalStartCol] = "Tổng vé";
      summaryHeaderTexts[summaryTotalStartCol + 1] = "Giấy mời";
      summaryHeaderTexts[summaryTotalStartCol + 2] = "Hợp đồng";
      summaryHeaderTexts[summaryTotalStartCol + 3] = "Vé bán + HĐ";
      summaryHeaderTexts[summaryTotalStartCol + 4] = "Tổng doanh thu";

      if (showDiscountColumns && summaryDiscountStartCol) {
        summaryHeaderTexts[summaryDiscountStartCol] = "KM";
        summaryHeaderTexts[summaryDiscountStartCol + 1] = "Giảm giá";

        if (showActualRemittance && summaryVnpayCol && summaryVietqrCol && summaryLastRevenueCol) {
          summaryHeaderTexts[summaryVnpayCol] = "VNPayQR";
          summaryHeaderTexts[summaryVietqrCol] = "VietQR";
          summaryHeaderTexts[summaryLastRevenueCol] = lastRevenueColumnTitle;
        } else if (summaryLastRevenueCol) {
          summaryHeaderTexts[summaryLastRevenueCol] = lastRevenueColumnTitle;
        }
      }
      const summaryStaticMergeCols = [
        1,
        2,
        3,
        summaryTotalStartCol,
        summaryTotalStartCol + 1,
        summaryTotalStartCol + 2,
        summaryTotalStartCol + 3,
        summaryTotalStartCol + 4,
        ...(showDiscountColumns && summaryDiscountStartCol
          ? [
              summaryDiscountStartCol,
              summaryDiscountStartCol + 1,
              ...(showActualRemittance && summaryVnpayCol && summaryVietqrCol
                ? [summaryVnpayCol, summaryVietqrCol, summaryLastRevenueCol!]
                : [summaryLastRevenueCol!])
            ]
          : [])
      ];

      summaryStaticMergeCols.forEach((col) => {
        wsSummary.mergeCells(summaryHeaderGroupRow, col, summaryHeaderRow, col);
      });

      if (allPrices.length > 0) {
        wsSummary.mergeCells(
          summaryHeaderGroupRow,
          summaryPriceStartCol,
          summaryHeaderGroupRow,
          summaryPriceEndCol
        );
      }
      [summaryHeaderGroupRow, summaryHeaderRow].forEach((rowNumber) => {
        wsSummary.getRow(rowNumber).font = { bold: true };
        wsSummary.getRow(rowNumber).alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true
        };
      });
      Object.entries(summaryByDate).forEach(([date, group]) => {
        const offSum = sumRows(group.off);
        const onSum = sumRows(group.on);

        wsSummary.addRow([
          dayjs(date).format("DD/MM/YYYY"),
          "Off",
          offSum.totalPlanScreen,
          ...allPrices.map((p) => offSum.prices[p] ?? ""),
          offSum.totalQuantity,
          offSum.totalInvitationQuantity,
          offSum.totalContractQuantity,
          getTotalTicketAndContract(offSum),
          offSum.actualSale,
          ...(showDiscountColumns
            ? [
                offSum.discountTotal,
                offSum.internalDiscountTotal,
                ...(showActualRemittance ? [offSum.saleVnPayQr, offSum.saleVietQr] : []),
                showActualRemittance
                  ? getActualRemittance(offSum)
                  : offSum.actualSale - offSum.discountTotal
              ]
            : [])
        ]);

        wsSummary.addRow([
          dayjs(date).format("DD/MM/YYYY"),
          "On",
          onSum.totalPlanScreen,
          ...allPrices.map((p) => onSum.prices[p] ?? ""),
          onSum.totalQuantity,
          onSum.totalInvitationQuantity,
          onSum.totalContractQuantity,
          getTotalTicketAndContract(onSum),
          onSum.actualSale,
          ...(showDiscountColumns
            ? [
                onSum.discountTotal,
                onSum.internalDiscountTotal,
                ...(showActualRemittance ? [onSum.saleVnPayQr, onSum.saleVietQr] : []),
                showActualRemittance
                  ? getActualRemittance(onSum)
                  : onSum.actualSale - onSum.discountTotal
              ]
            : [])
        ]);
      });

      const footerRows = [
        { label: "Offline", sum: sumRows(offlineRows) },
        { label: "Online", sum: sumRows(onlineRows) },
        { label: "Tổng cộng", sum: sumRows(totalRows) }
      ];

      footerRows.forEach(({ label, sum }) => {
        const row = wsSummary.addRow([
          label,
          "",
          label === "Tổng cộng" ? (totalPlanCount ?? "") : "",
          ...allPrices.map((p) => sum.prices[p] ?? ""),
          sum.totalQuantity,
          sum.totalInvitationQuantity,
          sum.totalContractQuantity,
          getTotalTicketAndContract(sum),
          sum.actualSale,
          ...(showDiscountColumns
            ? [
                sum.discountTotal,
                sum.internalDiscountTotal,
                ...(showActualRemittance ? [sum.saleVnPayQr, sum.saleVietQr] : []),
                showActualRemittance ? getActualRemittance(sum) : sum.actualSale - sum.discountTotal
              ]
            : [])
        ]);

        row.font = { bold: true };
      });

      const summaryCountCols = [
        3,
        ...allPrices.map((_, index) => summaryPriceStartCol + index),
        summaryTotalStartCol,
        summaryTotalStartCol + 1,
        summaryTotalStartCol + 2,
        summaryTotalStartCol + 3
      ];
      const summaryMoneyCols = [
        summaryTotalStartCol + 4,
        ...(showDiscountColumns && summaryDiscountStartCol
          ? [
              summaryDiscountStartCol,
              summaryDiscountStartCol + 1,
              ...(showActualRemittance && summaryVnpayCol && summaryVietqrCol
                ? [summaryVnpayCol, summaryVietqrCol, summaryLastRevenueCol!]
                : [summaryLastRevenueCol!])
            ]
          : [])
      ];

      summaryCountCols.forEach((summaryCol) => {
        wsSummary.getColumn(summaryCol).numFmt = "#,##0";
      });

      summaryMoneyCols.forEach((summaryCol) => {
        wsSummary.getColumn(summaryCol).numFmt = "#,##0";
      });

      autoFitWorksheetColumns(ws, {
        minWidth: 4,
        maxWidth: 14,
        extraWidth: 1,
        maxWidths: {
          1: 60
        },
        headerTexts: detailHeaderTexts,
        startRow: headerRowIndex,
        endRow: ws.lastRow!.number
      });

      autoFitWorksheetColumns(wsSummary, {
        minWidth: 4,
        maxWidth: 14,
        extraWidth: 1,
        headerTexts: summaryHeaderTexts,
        startRow: summaryHeaderRow,
        endRow: wsSummary.lastRow!.number
      });

      ws.views = [];

      wsSummary.views = [];

      const startRow = headerGroupRowIndex;
      const endRow = ws.lastRow!.number;
      const endCol = totalEndCol;

      for (let r = startRow; r <= endRow; r++) {
        for (let c = 1; c <= endCol; c++) {
          ws.getCell(r, c).border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" }
          };
        }
      }

      const row = ws.lastRow!;
      row.getCell(1).alignment = { wrapText: false, vertical: "middle" };

      const summaryStartRow = 1;
      const summaryEndRow = wsSummary.lastRow!.number;
      const summaryEndCol = summaryHeaderGroup.length;

      for (let r = summaryStartRow; r <= summaryEndRow; r++) {
        for (let c = 1; c <= summaryEndCol; c++) {
          wsSummary.getCell(r, c).border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" }
          };
        }
      }

      for (let r = headerRowIndex + 1; r <= ws.lastRow!.number; r++) {
        ws.getCell(r, 1).alignment = {
          horizontal: "left",
          vertical: "middle",
          wrapText: false
        };
      }

      for (
        let r = detailSummaryStartRowIndex;
        r < detailSummaryStartRowIndex + detailSummaryRows.length;
        r++
      ) {
        ws.getCell(r, 1).alignment = {
          horizontal: "left",
          vertical: "middle",
          wrapText: false
        };
      }

      const buf = await wb.xlsx.writeBuffer();
      const result = await saveExcelFile(new Uint8Array(buf), resolvedFileName, {
        openAfterSave: true
      });

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
