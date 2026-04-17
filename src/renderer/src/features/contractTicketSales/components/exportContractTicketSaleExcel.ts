import { saveExcelFile } from "@renderer/lib/saveFile";
import type { SaveFileResult } from "@renderer/lib/saveFile";
import { OrderDetailProps } from "@shared/types";
import dayjs from "dayjs";
import ExcelJS from "exceljs";

const moneyFormat = "#,##0";
const invalidFileNameChars = new Set(["<", ">", ":", '"', "/", "\\", "|", "?", "*"]);

type ExportRow = {
  viewingDate: string;
  filmName: string;
  showTime: string;
  roomName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

const sanitizeFileName = (value: string) =>
  Array.from(value)
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

const mergeConsecutiveRows = (
  worksheet: ExcelJS.Worksheet,
  rows: ExportRow[],
  startRow: number,
  valueGetter: (row: ExportRow) => string,
  columnIndex: number
) => {
  if (rows.length === 0) {
    return;
  }

  let groupStartIndex = 0;

  for (let index = 1; index <= rows.length; index++) {
    const currentValue = index < rows.length ? valueGetter(rows[index]) : null;
    const groupValue = valueGetter(rows[groupStartIndex]);

    if (currentValue === groupValue) {
      continue;
    }

    const groupLength = index - groupStartIndex;

    if (groupLength > 1 && groupValue) {
      worksheet.mergeCells(
        startRow + groupStartIndex,
        columnIndex,
        startRow + index - 1,
        columnIndex
      );
    }

    groupStartIndex = index;
  }
};

const buildExportRows = (orderDetail: OrderDetailProps): ExportRow[] => {
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
      .reduce((map, item) => {
        const key = item.planScreenId;
        const current = map.get(key) || {
          planScreenId: key,
          quantity: 0,
          unitPrice: Number(item.unitPriceInclTax || 0),
          amount: 0
        };

        current.quantity += Number(item.quantity || 0);
        current.amount += Number(item.priceInclTax || 0);
        current.unitPrice =
          current.quantity > 0 ? Math.round(current.amount / current.quantity) : current.unitPrice;

        map.set(key, current);
        return map;
      }, new Map<number, { planScreenId: number; quantity: number; unitPrice: number; amount: number }>())
      .values()
  );

  return aggregatedRows
    .map((item) => {
      const planDetail = planDetailMap.get(item.planScreenId);

      return {
        viewingDate: formatViewingDate(planDetail?.planScreening?.projectDate),
        filmName: planDetail?.film?.filmName || "",
        showTime: formatShowTime(planDetail?.planScreening?.projectTime),
        roomName: planDetail?.room?.name || "",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount
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
  const customerName = [orderDetail.order.customerFirstName, orderDetail.order.customerLastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const exportRows = buildExportRows(orderDetail);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Bao cao hop dong");
  const totalColumns = 7;
  const bodyStartRow = 4;
  const subtotal = exportRows.reduce((total, row) => total + row.amount, 0);
  const discount = Number(orderDetail.order.orderDiscount || 0);
  const finalTotal = Number(orderDetail.order.orderTotal || subtotal - discount);
  const discountPercent =
    subtotal > 0 && discount > 0 ? Math.round((discount / subtotal) * 100) : null;
  const title = `Báo cáo doanh thu ca chiếu hợp đồng${customerName ? ` ${customerName}` : ""}`;
  const fileName = sanitizeFileName(
    `bao-cao-doanh-thu-ca-chieu-hop-dong-${customerName || orderDetail.order.id}.xlsx`
  );
  const quantityRangeFormula = `SUM(E${bodyStartRow}:E${bodyStartRow + exportRows.length - 1})`;
  const amountRangeFormula = `SUM(G${bodyStartRow}:G${bodyStartRow + exportRows.length - 1})`;

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

  exportRows.forEach((row) => {
    const excelRow = worksheet.addRow([
      row.viewingDate,
      row.filmName,
      row.showTime,
      row.roomName,
      row.quantity,
      row.unitPrice,
      row.amount
    ]);

    excelRow.height = row.viewingDate ? 36 : 22;
  });

  mergeConsecutiveRows(worksheet, exportRows, bodyStartRow, (row) => row.viewingDate, 1);
  mergeConsecutiveRows(worksheet, exportRows, bodyStartRow, (row) => row.filmName, 2);
  mergeConsecutiveRows(worksheet, exportRows, bodyStartRow, (row) => row.showTime, 3);
  mergeConsecutiveRows(worksheet, exportRows, bodyStartRow, (row) => row.roomName, 4);

  const subtotalRowNumber = bodyStartRow + exportRows.length;
  const discountRowNumber = subtotalRowNumber + 1;
  const finalTotalRowNumber = discountRowNumber + 1;
  const wordsRowNumber = finalTotalRowNumber + 1;

  worksheet.mergeCells(subtotalRowNumber, 1, subtotalRowNumber, 4);
  worksheet.mergeCells(subtotalRowNumber, 5, subtotalRowNumber, 6);
  worksheet.getCell(subtotalRowNumber, 1).value = "Tổng (Chưa giảm giá)";
  worksheet.getCell(subtotalRowNumber, 5).value = {
    formula: quantityRangeFormula,
    result: exportRows.reduce((total, row) => total + row.quantity, 0)
  };
  worksheet.getCell(subtotalRowNumber, 7).value = {
    formula: amountRangeFormula,
    result: subtotal
  };

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
    worksheet.getCell(row, 1).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true
    };
    worksheet.getCell(row, 2).alignment = {
      horizontal: "left",
      vertical: "middle",
      wrapText: true
    };
    worksheet.getCell(row, 3).alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getCell(row, 4).alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getCell(row, 5).alignment = { horizontal: "right", vertical: "middle" };
    worksheet.getCell(row, 6).alignment = { horizontal: "right", vertical: "middle" };
    worksheet.getCell(row, 7).alignment = { horizontal: "right", vertical: "middle" };

    worksheet.getCell(row, 6).numFmt = moneyFormat;
    worksheet.getCell(row, 7).numFmt = moneyFormat;
  }

  worksheet.getRow(subtotalRowNumber).font = { bold: true };
  worksheet.getRow(discountRowNumber).font = { bold: true };
  worksheet.getRow(finalTotalRowNumber).font = { bold: true };
  worksheet.getRow(wordsRowNumber).font = { italic: true };

  worksheet.getCell(subtotalRowNumber, 1).alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getCell(subtotalRowNumber, 5).alignment = { horizontal: "right", vertical: "middle" };
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

  worksheet.getCell(subtotalRowNumber, 7).numFmt = moneyFormat;
  worksheet.getCell(discountRowNumber, 7).numFmt = moneyFormat;
  worksheet.getCell(finalTotalRowNumber, 7).numFmt = moneyFormat;

  applyThinBorder(worksheet, 3, finalTotalRowNumber, 1, totalColumns);
  applyThinBorder(worksheet, wordsRowNumber, wordsRowNumber, 1, totalColumns);
  workbook.calcProperties.fullCalcOnLoad = true;

  return saveExcelFile(new Uint8Array(await workbook.xlsx.writeBuffer()), fileName);
};
