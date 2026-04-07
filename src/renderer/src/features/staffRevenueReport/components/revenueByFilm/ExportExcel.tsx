import Icon from "@ant-design/icons";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { saveExcelFile } from "@renderer/lib/saveFile";
import { usePermission } from "@renderer/permissions/usePermission";
import { Button, message } from "antd";
import ExcelJS from "exceljs";
import { DownloadIcon } from "lucide-react";
import dayjs from "dayjs";

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
  fromDate: string;
  toDate: string;
  dateType: number;
  employeeName?: string;
  fileName?: string;
};

const getReportTitleByDateType = (dateType: number) =>
  dateType === 1 ? "Báo cáo doanh thu phim theo ngày bán" : "Báo cáo doanh thu theo lịch chiếu";

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

const ExportRevenueExcelButton = ({
  tableData,
  allPrices,
  summaryByDate,
  fromDate,
  toDate,
  dateType,
  employeeName = "Tất cả",
  fileName
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
      const ws = wb.addWorksheet("Doanh thu theo phim");
      const reportTitle = getReportTitleByDateType(dateType);
      const formattedFromDate = dayjs(fromDate).format("DD/MM/YYYY");
      const formattedToDate = dayjs(toDate).format("DD/MM/YYYY");
      const filmGroups = buildFilmGroups(tableData);
      const resolvedFileName =
        fileName ??
        `${reportTitle} ${dayjs(fromDate).format("DD-MM-YYYY")}-${dayjs(toDate).format("DD-MM-YYYY")}.xlsx`;

      const header = [
        "Phim",
        "Ngày",
        "Giờ",
        "Phòng",
        "Loại",
        ...allPrices.map((p) => (p / 1000).toString()),
        "Tổng",
        "Giấy mời",
        "Hợp đồng",
        "Thành tiền",
        "KM Offline",
        "KM Online",
        "KM Đại lý",
        "Tổng sau KM",
        "Giảm giá",
        "VNPayQR",
        "VietQR",
        "Thực nộp"
      ];

      const totalColumns = header.length;

      // ===== TITLE =====
      ws.addRow([]);
      ws.getCell(1, 1).value = reportTitle.toUpperCase();
      ws.mergeCells(1, 1, 1, totalColumns);
      ws.getRow(1).font = { bold: true, size: 16 };
      ws.getRow(1).alignment = { horizontal: "center" };

      ws.addRow([]);
      ws.mergeCells(ws.lastRow!.number, 1, ws.lastRow!.number, totalColumns);

      ws.getCell(ws.lastRow!.number, 1).value =
        `Từ ngày: ${formattedFromDate}  -  Đến ngày: ${formattedToDate}`;

      ws.getRow(ws.lastRow!.number).alignment = {
        horizontal: "center",
        vertical: "middle"
      };
      ws.getRow(ws.lastRow!.number).font = { italic: true };

      ws.addRow([]);
      ws.mergeCells(ws.lastRow!.number, 1, ws.lastRow!.number, totalColumns);

      ws.getCell(ws.lastRow!.number, 1).value = `Nhân viên: ${employeeName}`;
      ws.getRow(ws.lastRow!.number).alignment = {
        horizontal: "center",
        vertical: "middle"
      };
      ws.getRow(ws.lastRow!.number).font = { italic: true };

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
      const amountCol = totalStartCol + 3;

      let totalCol = totalStartCol;

      const totalHeaders = ["Tổng vé", "Giấy mời", "Hợp đồng", "Thành tiền"];

      totalHeaders.forEach((title) => {
        ws.mergeCells(headerGroupRowIndex, totalCol, headerGroupRowIndex + 1, totalCol);
        ws.getCell(headerGroupRowIndex, totalCol).value = title;
        totalCol++;
      });

      const discountStartCol = amountCol + 1;
      const discountEndCol = discountStartCol + 2;

      ws.mergeCells(headerGroupRowIndex, discountStartCol, headerGroupRowIndex, discountEndCol);
      ws.getCell(headerGroupRowIndex, discountStartCol).value = "Khuyến mại";

      const discountTotalCol = discountEndCol + 1;

      ws.mergeCells(
        headerGroupRowIndex,
        discountTotalCol,
        headerGroupRowIndex + 1,
        discountTotalCol
      );
      ws.getCell(headerGroupRowIndex, discountTotalCol).value = "Tổng sau KM";

      const internalDiscountCol = discountTotalCol + 1;

      ws.mergeCells(
        headerGroupRowIndex,
        internalDiscountCol,
        headerGroupRowIndex + 1,
        internalDiscountCol
      );
      ws.getCell(headerGroupRowIndex, internalDiscountCol).value = "Giảm giá";

      const paymentStartCol = internalDiscountCol + 1;
      const paymentHeaders = ["VNPayQR", "VietQR", "Thực nộp"];

      paymentHeaders.forEach((title, index) => {
        const paymentCol = paymentStartCol + index;
        ws.mergeCells(headerGroupRowIndex, paymentCol, headerGroupRowIndex + 1, paymentCol);
        ws.getCell(headerGroupRowIndex, paymentCol).value = title;
      });

      const discountHeaders = ["Offline", "Online", "Đại lý"];
      const COL_AMOUNT = amountCol;
      const COL_VNPAY = paymentStartCol;
      const COL_VIETQR = paymentStartCol + 1;
      const COL_ACTUAL = paymentStartCol + 2;
      const COL_DISCOUNT_OFFLINE = discountStartCol;
      const COL_DISCOUNT_ONLINE = discountStartCol + 1;
      const COL_DISCOUNT_PARTNER = discountStartCol + 2;
      const COL_DISCOUNT_TOTAL = discountStartCol + 3;
      const COL_INTERNAL_DISCOUNT = internalDiscountCol;
      const totalEndCol = COL_ACTUAL;

      const moneyFormat = "#,##0";

      [
        COL_DISCOUNT_OFFLINE,
        COL_DISCOUNT_ONLINE,
        COL_DISCOUNT_PARTNER,
        COL_DISCOUNT_TOTAL,
        COL_INTERNAL_DISCOUNT,
        COL_AMOUNT,
        COL_VNPAY,
        COL_VIETQR,
        COL_ACTUAL
      ].forEach((col) => {
        ws.getColumn(col).numFmt = moneyFormat;
      });

      const headerRowIndex = headerGroupRowIndex + 1;
      const headerRow = ws.getRow(headerRowIndex);

      let col = 2;

      headerRow.getCell(col++).value = "Ngày";
      headerRow.getCell(col++).value = "Giờ";
      headerRow.getCell(col++).value = "Phòng";
      headerRow.getCell(col++).value = "Loại";

      allPrices.forEach((p) => {
        headerRow.getCell(col++).value = (p / 1000).toString();
      });

      discountHeaders.forEach((title) => {
        headerRow.getCell(col++).value = title;
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

      filmGroups.forEach((film) => {
        const summaryRow = ws.addRow([
          film.filmName,
          "",
          "",
          "",
          "",
          ...allPrices.map((p) => film.pricesMap[p] ?? ""),
          film.totalQuantity,
          film.totalInvitationQuantity,
          film.totalContractQuantity,
          film.totalSale,
          film.discountOffline,
          film.discountOnline,
          film.discountPartner,
          film.totalSale - film.discountTotal,
          film.internalDiscountTotal,
          film.saleVnPayQr,
          film.saleVietQr,
          film.actualSale
        ]);

        summaryRow.font = { bold: true };
        summaryRow.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF3F4F6" }
          };
        });

        film.rows.forEach((r) => {
          ws.addRow([
            "",
            dayjs(r.projectDate).format("DD/MM/YYYY"),
            r.projectTime,
            r.roomName,
            r.isOnline ? "On" : "Off",
            ...allPrices.map((p) => r.pricesMap[p] ?? ""),
            r.totalQuantity,
            r.totalInvitationQuantity,
            r.totalContractQuantity,
            r.totalSale,
            r.discountOffline,
            r.discountOnline,
            r.discountPartner,
            r.totalSale - r.discountTotal,
            r.internalDiscountTotal,
            r.saleVnPayQr,
            r.saleVietQr,
            r.actualSale
          ]);
        });
      });

      const wsSummary = wb.addWorksheet("Tổng hợp theo ngày");
      const summaryHeaderGroup = [
        "Ngày",
        "Loại",
        "Tổng ca chiếu",
        ...allPrices.map((_, index) => (index === 0 ? "Loại giá vé (Đơn vị tính: 1000 đồng)" : "")),
        "Tổng vé",
        "Giấy mời",
        "Hợp đồng",
        "Thành tiền",
        "Khuyến mại",
        "",
        "",
        "Tổng sau KM",
        "Giảm giá",
        "VNPayQR",
        "VietQR",
        "Thực nộp"
      ];
      const summaryHeaderDetail = [
        "",
        "",
        "",
        ...allPrices.map((p) => (p / 1000).toString()),
        "",
        "",
        "",
        "",
        "Offline",
        "Online",
        "Đại lý",
        "",
        "",
        "",
        "",
        ""
      ];

      wsSummary.addRow(summaryHeaderGroup);
      wsSummary.addRow(summaryHeaderDetail);

      const summaryHeaderGroupRow = 1;
      const summaryHeaderRow = 2;
      const summaryPriceStartCol = 4;
      const summaryPriceEndCol = summaryPriceStartCol + allPrices.length - 1;
      const summaryTotalStartCol = summaryPriceStartCol + allPrices.length;
      const summaryDiscountStartCol = summaryTotalStartCol + 4;
      const summaryDiscountEndCol = summaryDiscountStartCol + 2;

      [
        1,
        2,
        3,
        summaryTotalStartCol,
        summaryTotalStartCol + 1,
        summaryTotalStartCol + 2,
        summaryTotalStartCol + 3,
        summaryDiscountEndCol + 1,
        summaryDiscountEndCol + 2,
        summaryDiscountEndCol + 3,
        summaryDiscountEndCol + 4,
        summaryDiscountEndCol + 5
      ].forEach((col) => {
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
      wsSummary.mergeCells(
        summaryHeaderGroupRow,
        summaryDiscountStartCol,
        summaryHeaderGroupRow,
        summaryDiscountEndCol
      );

      [summaryHeaderGroupRow, summaryHeaderRow].forEach((rowNumber) => {
        wsSummary.getRow(rowNumber).font = { bold: true };
        wsSummary.getRow(rowNumber).alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true
        };
      });
      wsSummary.columns.forEach((c) => (c.width = 14));

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
          offSum.totalSale,
          offSum.discountOffline,
          offSum.discountOnline,
          offSum.discountPartner,
          offSum.totalSale - offSum.discountTotal,
          offSum.internalDiscountTotal,
          offSum.saleVnPayQr,
          offSum.saleVietQr,
          offSum.actualSale
        ]);

        wsSummary.addRow([
          dayjs(date).format("DD/MM/YYYY"),
          "On",
          onSum.totalPlanScreen,
          ...allPrices.map((p) => onSum.prices[p] ?? ""),
          onSum.totalQuantity,
          onSum.totalInvitationQuantity,
          onSum.totalContractQuantity,
          onSum.totalSale,
          onSum.discountOffline,
          onSum.discountOnline,
          onSum.discountPartner,
          onSum.totalSale - onSum.discountTotal,
          onSum.internalDiscountTotal,
          onSum.saleVnPayQr,
          onSum.saleVietQr,
          onSum.actualSale
        ]);
      });

      const offlineRows = Object.values(summaryByDate).flatMap((group) => group.off);
      const onlineRows = Object.values(summaryByDate).flatMap((group) => group.on);
      const totalRows = [...offlineRows, ...onlineRows];
      const footerRows = [
        { label: "Offline", sum: sumRows(offlineRows) },
        { label: "Online", sum: sumRows(onlineRows) },
        { label: "Tổng cộng", sum: sumRows(totalRows) }
      ];

      footerRows.forEach(({ label, sum }) => {
        const row = wsSummary.addRow([
          label,
          "",
          "",
          ...allPrices.map((p) => sum.prices[p] ?? ""),
          sum.totalQuantity,
          sum.totalInvitationQuantity,
          sum.totalContractQuantity,
          sum.totalSale,
          sum.discountOffline,
          sum.discountOnline,
          sum.discountPartner,
          sum.totalSale - sum.discountTotal,
          sum.internalDiscountTotal,
          sum.saleVnPayQr,
          sum.saleVietQr,
          sum.actualSale
        ]);

        row.font = { bold: true };
      });

      ws.columns.forEach((colItem) => {
        colItem.width = 14;
      });

      const moneyColsSummary = [
        8 + allPrices.length,
        9 + allPrices.length,
        10 + allPrices.length,
        11 + allPrices.length,
        12 + allPrices.length,
        13 + allPrices.length,
        14 + allPrices.length,
        15 + allPrices.length
      ];

      moneyColsSummary.forEach((summaryCol) => {
        wsSummary.getColumn(summaryCol).numFmt = "#,##0";
      });

      ws.getColumn(1).width = 40;

      ws.views = [
        {
          state: "frozen",
          ySplit: headerRowIndex,
          xSplit: 1
        }
      ];

      wsSummary.views = [
        {
          state: "frozen",
          ySplit: 2
        }
      ];

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
      row.getCell(1).alignment = { wrapText: true, vertical: "middle" };

      const summaryStartRow = 1;
      const summaryEndRow = wsSummary.lastRow!.number;
      const summaryEndCol = 15 + allPrices.length;

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
          wrapText: true
        };
      }

      const buf = await wb.xlsx.writeBuffer();
      const result = await saveExcelFile(new Uint8Array(buf), resolvedFileName);

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
