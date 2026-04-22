import { seatTypesApi } from "@renderer/api/seatTypes.api";
import { saveExcelFile } from "@renderer/lib/saveFile";
import type { SaveFileResult } from "@renderer/lib/saveFile";
import { OrderDetailProps } from "@shared/types";
import dayjs from "dayjs";
import ExcelJS from "exceljs";

const moneyFormat = "#,##0";

type ExportRow = {
  viewingDate: string;
  filmName: string;
  showTime: string;
  roomName: string;
  quantity: number;
  details: Array<{
    quantity: number;
    quantityDisplay: string;
    unitPrice: number;
    unitPriceDisplay: string;
    amount: number;
  }>;
};

const viWeekdays = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

const digits = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

const formatViewingDate = (value?: string | null) => {
  if (!value || !dayjs(value, "YYYY-MM-DD").isValid()) {
    return "";
  }

  const date = dayjs(value, "YYYY-MM-DD");
  return `${date.format("DD/MM/YYYY")}\n${viWeekdays[date.day()]}`;
};

const formatShowTime = (value?: string | null) => {
  if (!value) {
    return "";
  }

  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("HH:mm") : value;
};

const readThreeDigits = (value: number, full: boolean) => {
  const hundreds = Math.floor(value / 100);
  const tens = Math.floor((value % 100) / 10);
  const ones = value % 10;
  const parts: string[] = [];

  if (hundreds > 0 || full) {
    parts.push(`${digits[hundreds]} trăm`);
  }

  if (tens > 1) {
    parts.push(`${digits[tens]} mươi`);
    if (ones === 1) {
      parts.push("mốt");
    } else if (ones === 4) {
      parts.push("tư");
    } else if (ones === 5) {
      parts.push("lăm");
    } else if (ones > 0) {
      parts.push(digits[ones]);
    }
    return parts.join(" ").trim();
  }

  if (tens === 1) {
    parts.push("mười");
    if (ones === 5) {
      parts.push("lăm");
    } else if (ones > 0) {
      parts.push(digits[ones]);
    }
    return parts.join(" ").trim();
  }

  if (ones > 0) {
    if (hundreds > 0 || full) {
      parts.push("lẻ");
    }
    parts.push(digits[ones]);
  }

  return parts.join(" ").trim();
};

const numberToVietnameseWords = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return digits[0];
  }

  const scales = ["", "nghìn", "triệu", "tỷ"];
  const groups: number[] = [];
  let remaining = Math.floor(value);

  while (remaining > 0) {
    groups.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  const parts: string[] = [];

  for (let index = groups.length - 1; index >= 0; index--) {
    const groupValue = groups[index];

    if (groupValue === 0) {
      continue;
    }

    const isFullGroup = index < groups.length - 1 && groupValue < 100;
    const groupText = readThreeDigits(groupValue, isFullGroup);
    const scale = scales[index % scales.length];
    const repeatedTyCount = Math.floor(index / 3);

    parts.push(groupText);

    if (scale) {
      parts.push(scale);
    }

    for (let count = 0; count < repeatedTyCount; count++) {
      parts.push("tỷ");
    }
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
};

const capitalizeFirstLetter = (value: string) =>
  value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;

const formatDisplayPrice = (value: number) => `${new Intl.NumberFormat("vi-VN").format(value)}đ`;

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

const buildExportRows = (
  orderDetail: OrderDetailProps,
  seatTypeNameMap: Map<number, string>
): ExportRow[] => {
  const planDetailMap = new Map(
    (orderDetail.planDetails || [])
      .filter((item) => item.planScreening?.id)
      .map((item) => [item.planScreening.id, item])
  );

  if (orderDetail.planScreening?.id && !planDetailMap.has(orderDetail.planScreening.id)) {
    planDetailMap.set(orderDetail.planScreening.id, orderDetail);
  }

  const aggregatedRows = Array.from(
    (orderDetail.order.items || [])
      .reduce(
        (map, item) => {
          const key = item.planScreenId;
          const current = map.get(key) || {
            planScreenId: key,
            quantity: 0,
            amount: 0,
            positions: new Map<
              number,
              { positionId: number; quantity: number; unitPrice: number }
            >()
          };

          current.quantity += Number(item.quantity || 0);
          current.amount += Number(item.priceInclTax || 0);

          const positionKey = Number(item.positionId || 0);
          const currentPosition = current.positions.get(positionKey) || {
            positionId: positionKey,
            quantity: 0,
            unitPrice: Number(item.originUnitPriceInclTax || item.unitPriceInclTax || 0)
          };

          currentPosition.quantity += Number(item.quantity || 0);
          currentPosition.unitPrice = Number(
            item.originUnitPriceInclTax || currentPosition.unitPrice || item.unitPriceInclTax || 0
          );
          current.positions.set(positionKey, currentPosition);

          map.set(key, current);
          return map;
        },
        new Map<
          number,
          {
            planScreenId: number;
            quantity: number;
            amount: number;
            positions: Map<number, { positionId: number; quantity: number; unitPrice: number }>;
          }
        >()
      )
      .values()
  );

  return aggregatedRows
    .map((item) => {
      const planDetail = planDetailMap.get(item.planScreenId);
      const positionNameMap = new Map<number, string>();

      planDetail?.planScreening?.listSeats?.flat().forEach((seat) => {
        if (seat.positionId == null || positionNameMap.has(seat.positionId)) {
          return;
        }

        positionNameMap.set(seat.positionId, seat.positionName);
      });

      const positionRows = Array.from(item.positions.values()).sort(
        (left, right) => left.unitPrice - right.unitPrice || left.positionId - right.positionId
      );

      const details = positionRows.map((position) => {
        const positionName =
          seatTypeNameMap.get(position.positionId) ||
          positionNameMap.get(position.positionId) ||
          (position.positionId === 1 ? "Vip" : position.positionId === 2 ? "Thường" : "");

        return {
          quantity: position.quantity,
          quantityDisplay: [position.quantity, positionName].filter(Boolean).join("\n"),
          unitPrice: position.unitPrice,
          unitPriceDisplay: formatDisplayPrice(position.unitPrice),
          amount: position.quantity * position.unitPrice
        };
      });

      return {
        viewingDate: formatViewingDate(planDetail?.planScreening?.projectDate),
        filmName: planDetail?.film?.filmName || "",
        showTime: formatShowTime(planDetail?.planScreening?.projectTime),
        roomName: planDetail?.room?.name || "",
        quantity: item.quantity,
        details:
          details.length > 0
            ? details
            : [{ quantity: 0, quantityDisplay: "", unitPrice: 0, unitPriceDisplay: "", amount: 0 }]
      };
    })
    .sort((left, right) => {
      const leftDate = left.viewingDate || "";
      const rightDate = right.viewingDate || "";

      return (
        leftDate.localeCompare(rightDate, "vi") ||
        left.filmName.localeCompare(right.filmName, "vi") ||
        left.showTime.localeCompare(right.showTime, "vi") ||
        left.roomName.localeCompare(right.roomName, "vi")
      );
    });
};

export const exportContractTicketSaleExcel = async (
  orderDetail: OrderDetailProps
): Promise<SaveFileResult> => {
  const seatTypes = await seatTypesApi.getAll({ current: 1, pageSize: 200 });
  const seatTypeNameMap = new Map(
    (seatTypes.data || []).map((seatType) => [seatType.id, seatType.name])
  );
  const customerName = [orderDetail.order.customerFirstName, orderDetail.order.customerLastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const exportRows = buildExportRows(orderDetail, seatTypeNameMap);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Bao cao hop dong");
  const totalColumns = 7;
  const bodyStartRow = 4;
  const subtotal = exportRows.reduce(
    (total, row) => total + row.details.reduce((sum, detail) => sum + detail.amount, 0),
    0
  );
  const discount = Number(orderDetail.order.orderDiscount || 0);
  const finalTotal = Math.max(subtotal - discount, 0);
  const discountPercent =
    subtotal > 0 && discount > 0 ? Math.round((discount / subtotal) * 100) : null;
  const title = `Báo cáo doanh thu ca chiếu hợp đồng${customerName ? ` ${customerName}` : ""}`;
  const fileName = `${title}.xlsx`;

  worksheet.mergeCells(1, 1, 1, totalColumns);
  worksheet.getCell(1, 1).value = title;
  worksheet.getCell(1, 1).font = { bold: true, size: 16 };
  worksheet.getCell(1, 1).alignment = { horizontal: "center", vertical: "middle" };

  const headers = [
    "Ngày xem",
    "Tên phim",
    "Ca chiếu",
    "Phòng số",
    "Số lượng",
    "Đơn giá",
    "Thành tiền"
  ];

  headers.forEach((header, index) => {
    worksheet.getCell(3, index + 1).value = header;
  });

  worksheet.getRow(3).font = { bold: true };
  worksheet.getRow(3).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true
  };

  let currentBodyRow = bodyStartRow;

  exportRows.forEach((row) => {
    const groupStartRow = currentBodyRow;

    row.details.forEach((detail) => {
      const excelRow = worksheet.addRow([
        "",
        "",
        "",
        "",
        detail.quantityDisplay,
        detail.unitPrice,
        ""
      ]);

      const quantityLineCount = Math.max(detail.quantityDisplay.split("\n").length, 1);
      excelRow.height = Math.max(26, quantityLineCount * 18 + 8);
      worksheet.getCell(currentBodyRow, 7).value = {
        formula: `${detail.quantity}*F${currentBodyRow}`,
        result: detail.amount
      };
      currentBodyRow += 1;
    });

    const groupEndRow = currentBodyRow - 1;

    worksheet.getCell(groupStartRow, 1).value = row.viewingDate;
    worksheet.getCell(groupStartRow, 2).value = row.filmName;
    worksheet.getCell(groupStartRow, 3).value = row.showTime;
    worksheet.getCell(groupStartRow, 4).value = row.roomName;
    if (groupEndRow > groupStartRow) {
      worksheet.mergeCells(groupStartRow, 1, groupEndRow, 1);
      worksheet.mergeCells(groupStartRow, 2, groupEndRow, 2);
      worksheet.mergeCells(groupStartRow, 3, groupEndRow, 3);
      worksheet.mergeCells(groupStartRow, 4, groupEndRow, 4);
    }
  });

  const subtotalRowNumber = currentBodyRow;
  const discountRowNumber = subtotalRowNumber + 1;
  const finalTotalRowNumber = discountRowNumber + 1;
  const wordsRowNumber = finalTotalRowNumber + 1;

  worksheet.mergeCells(subtotalRowNumber, 1, subtotalRowNumber, 4);
  worksheet.mergeCells(subtotalRowNumber, 5, subtotalRowNumber, 6);
  worksheet.getCell(subtotalRowNumber, 1).value = "Tổng (Chưa giảm giá)";
  worksheet.getCell(subtotalRowNumber, 5).value = exportRows.reduce(
    (total, row) => total + row.quantity,
    0
  );
  worksheet.getCell(subtotalRowNumber, 7).value = subtotal;

  worksheet.mergeCells(discountRowNumber, 1, discountRowNumber, 6);
  worksheet.getCell(discountRowNumber, 1).value =
    `Giảm giá (${discountPercent ? `${discountPercent}%` : "Không"})`;
  worksheet.getCell(discountRowNumber, 7).value = discount;

  worksheet.mergeCells(finalTotalRowNumber, 1, finalTotalRowNumber, 6);
  worksheet.getCell(finalTotalRowNumber, 1).value = "Tổng số tiền phải thanh toán sau khi giảm giá";
  worksheet.getCell(finalTotalRowNumber, 7).value = {
    formula: `IF(G${discountRowNumber}<1,G${subtotalRowNumber}*(1-G${discountRowNumber}),G${subtotalRowNumber}-G${discountRowNumber})`,
    result: finalTotal
  };

  worksheet.mergeCells(wordsRowNumber, 1, wordsRowNumber, 7);
  worksheet.getCell(wordsRowNumber, 1).value =
    `Bằng chữ: ${capitalizeFirstLetter(numberToVietnameseWords(finalTotal))} đồng`;
  worksheet.getRow(wordsRowNumber).height = 34;

  worksheet.columns = [
    { width: 18 },
    { width: 34 },
    { width: 13 },
    { width: 12 },
    { width: 12 },
    { width: 14 },
    { width: 18 }
  ];

  for (let row = bodyStartRow; row < subtotalRowNumber; row++) {
    [1, 3, 4].forEach((column) => {
      worksheet.getCell(row, column).alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true
      };
    });

    worksheet.getCell(row, 2).alignment = {
      horizontal: "left",
      vertical: "middle",
      wrapText: true
    };
    worksheet.getCell(row, 5).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true
    };
    worksheet.getCell(row, 6).alignment = {
      horizontal: "right",
      vertical: "middle",
      wrapText: true
    };
    worksheet.getCell(row, 7).alignment = { horizontal: "right", vertical: "middle" };
    worksheet.getCell(row, 6).numFmt = moneyFormat;
    worksheet.getCell(row, 7).numFmt = moneyFormat;
  }

  worksheet.getRow(subtotalRowNumber).font = { bold: true };
  worksheet.getRow(discountRowNumber).font = { bold: true };
  worksheet.getRow(finalTotalRowNumber).font = { bold: true };
  worksheet.getRow(wordsRowNumber).font = { italic: true };

  worksheet.getCell(subtotalRowNumber, 1).alignment = { horizontal: "left", vertical: "middle" };
  worksheet.getCell(subtotalRowNumber, 5).alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getCell(subtotalRowNumber, 7).alignment = { horizontal: "right", vertical: "middle" };
  worksheet.getCell(discountRowNumber, 1).alignment = { horizontal: "left", vertical: "middle" };
  worksheet.getCell(discountRowNumber, 7).alignment = { horizontal: "right", vertical: "middle" };
  worksheet.getCell(finalTotalRowNumber, 1).alignment = {
    horizontal: "left",
    vertical: "middle"
  };
  worksheet.getCell(finalTotalRowNumber, 7).alignment = {
    horizontal: "right",
    vertical: "middle"
  };
  worksheet.getCell(wordsRowNumber, 1).alignment = {
    horizontal: "left",
    vertical: "middle",
    wrapText: true
  };

  worksheet.getCell(subtotalRowNumber, 5).numFmt = "0";
  worksheet.getCell(subtotalRowNumber, 7).numFmt = moneyFormat;
  worksheet.getCell(discountRowNumber, 7).numFmt = moneyFormat;
  worksheet.getCell(finalTotalRowNumber, 7).numFmt = moneyFormat;

  applyThinBorder(worksheet, 3, finalTotalRowNumber, 1, totalColumns);
  applyThinBorder(worksheet, wordsRowNumber, wordsRowNumber, 1, totalColumns);
  workbook.calcProperties.fullCalcOnLoad = true;

  return saveExcelFile(new Uint8Array(await workbook.xlsx.writeBuffer()), fileName);
};
