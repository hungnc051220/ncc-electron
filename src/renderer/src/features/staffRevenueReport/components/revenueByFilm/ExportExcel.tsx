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
        "KM Offline",
        "KM Online",
        "KM Đại lý",
        "Tổng sau KM",
        "Tổng",
        "Giấy mời",
        "Hợp đồng",
        "Thành tiền",
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

      const discountStartCol = priceEndCol + 1;
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

      const totalStartCol = discountTotalCol + 1;
      const totalEndCol = totalStartCol + 6;

      const discountHeaders = ["Offline", "Online", "Đại lý"];

      let totalCol = totalStartCol;

      const COL_AMOUNT = totalCol + 3;
      const COL_VNPAY = totalCol + 4;
      const COL_VIETQR = totalCol + 5;
      const COL_ACTUAL = totalCol + 6;
      const COL_DISCOUNT_OFFLINE = discountStartCol;
      const COL_DISCOUNT_ONLINE = discountStartCol + 1;
      const COL_DISCOUNT_PARTNER = discountStartCol + 2;
      const COL_DISCOUNT_TOTAL = discountStartCol + 3;

      const moneyFormat = "#,##0";

      [
        COL_DISCOUNT_OFFLINE,
        COL_DISCOUNT_ONLINE,
        COL_DISCOUNT_PARTNER,
        COL_DISCOUNT_TOTAL,
        COL_AMOUNT,
        COL_VNPAY,
        COL_VIETQR,
        COL_ACTUAL
      ].forEach((col) => {
        ws.getColumn(col).numFmt = moneyFormat;
      });

      const totalHeaders = [
        "Tổng",
        "Giấy mời",
        "Hợp đồng",
        "Thành tiền",
        "VNPayQR",
        "VietQR",
        "Thực nộp"
      ];

      totalHeaders.forEach((title) => {
        ws.mergeCells(headerGroupRowIndex, totalCol, headerGroupRowIndex + 1, totalCol);
        ws.getCell(headerGroupRowIndex, totalCol).value = title;
        totalCol++;
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

      tableData.forEach((r) => {
        ws.addRow([
          r.filmName,
          dayjs(r.projectDate).format("DD/MM/YYYY"),
          r.projectTime,
          r.roomName,
          r.isOnline ? "On" : "Off",
          ...allPrices.map((p) => r.pricesMap[p] ?? ""),
          r.discountOffline,
          r.discountOnline,
          r.discountPartner,
          r.discountTotal,
          r.totalQuantity,
          r.totalInvitationQuantity,
          r.totalContractQuantity,
          r.totalSale,
          r.saleVnPayQr,
          r.saleVietQr,
          r.actualSale
        ]);
      });

      let rowIndex = headerRowIndex + 1;

      tableData.forEach((r) => {
        if (r.filmRowSpan && r.filmRowSpan > 1) {
          const startRow = rowIndex;
          const endRow = rowIndex + r.filmRowSpan - 1;

          ws.mergeCells(startRow, 1, endRow, 1);
          ws.getCell(startRow, 1).alignment = {
            horizontal: "left",
            vertical: "middle",
            wrapText: true
          };
        }

        if (!r.filmRowSpan || r.filmRowSpan === 1) {
          ws.getCell(rowIndex, 1).alignment = {
            horizontal: "left",
            vertical: "middle",
            wrapText: true
          };
        }

        if (r.dateRowSpan && r.dateRowSpan > 1) {
          ws.mergeCells(rowIndex, 2, rowIndex + r.dateRowSpan - 1, 2);
          ws.getCell(rowIndex, 2).alignment = {
            horizontal: "center",
            vertical: "middle"
          };
        }

        if (!r.dateRowSpan || r.dateRowSpan === 1) {
          ws.getCell(rowIndex, 2).alignment = {
            horizontal: "center",
            vertical: "middle"
          };
        }

        if (r.onlineRowSpan && r.onlineRowSpan > 1) {
          ws.mergeCells(rowIndex, 5, rowIndex + r.onlineRowSpan - 1, 5);
        }
        rowIndex++;
      });

      const wsSummary = wb.addWorksheet("Tổng hợp theo ngày");
      wsSummary.addRow([
        "Ngày",
        "Loại",
        ...allPrices.map((p) => p / 1000),
        "KM Offline",
        "KM Online",
        "KM Đại lý",
        "Tổng sau KM",
        "Tổng",
        "Giấy mời",
        "Hợp đồng",
        "Thành tiền",
        "VNPayQR",
        "VietQR",
        "Thực nộp"
      ]);

      wsSummary.getRow(1).font = { bold: true };
      wsSummary.getRow(1).alignment = {
        horizontal: "center",
        vertical: "middle"
      };
      wsSummary.columns.forEach((c) => (c.width = 14));

      Object.entries(summaryByDate).forEach(([date, group]) => {
        const sum = (rows: Row[]) => {
          const prices: Record<number, number> = {};
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

          rows.forEach((r) => {
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

            Object.entries(r.pricesMap).forEach(([p, q]) => {
              const price = Number(p);
              prices[price] = (prices[price] ?? 0) + q;
            });
          });

          return {
            prices,
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
            discountTotal
          };
        };

        const offSum = sum(group.off);
        const onSum = sum(group.on);

        wsSummary.addRow([
          dayjs(date).format("DD/MM/YYYY"),
          "Off",
          ...allPrices.map((p) => offSum.prices[p] ?? ""),
          offSum.discountOffline,
          offSum.discountOnline,
          offSum.discountPartner,
          offSum.discountTotal,
          offSum.totalQuantity,
          offSum.totalInvitationQuantity,
          offSum.totalContractQuantity,
          offSum.totalSale,
          offSum.saleVnPayQr,
          offSum.saleVietQr,
          offSum.actualSale
        ]);

        wsSummary.addRow([
          dayjs(date).format("DD/MM/YYYY"),
          "On",
          ...allPrices.map((p) => onSum.prices[p] ?? ""),
          onSum.discountOffline,
          onSum.discountOnline,
          onSum.discountPartner,
          onSum.discountTotal,
          onSum.totalQuantity,
          onSum.totalInvitationQuantity,
          onSum.totalContractQuantity,
          onSum.totalSale,
          onSum.saleVnPayQr,
          onSum.saleVietQr,
          onSum.actualSale
        ]);
      });

      ws.columns.forEach((colItem) => {
        colItem.width = 14;
      });

      const moneyColsSummary = [
        3 + allPrices.length,
        4 + allPrices.length,
        5 + allPrices.length,
        6 + allPrices.length,
        10 + allPrices.length,
        11 + allPrices.length,
        12 + allPrices.length,
        13 + allPrices.length
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
          ySplit: 1
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
      const summaryEndCol = 13 + allPrices.length;

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
