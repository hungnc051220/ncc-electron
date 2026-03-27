import { OrderDetailProps, PrintTicketPayload } from "@shared/types";
import type { InputNumberProps } from "antd";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import dayjs from "dayjs";
import QRCode from "qrcode";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const decodeToken = (token: string) => {
  try {
    const base64Url = token.split(".")[1];

    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");

    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );

    return JSON.parse(json);
  } catch {
    return null;
  }
};

export const formatMoney = (price: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

const extractTimePart = (projectTime?: string) => {
  if (!projectTime) return undefined;

  const parsedTime = dayjs(projectTime);
  if (parsedTime.isValid()) {
    return parsedTime.format("HH:mm:ss");
  }

  const matchedTime = projectTime.match(/\b\d{2}:\d{2}(:\d{2})?\b/);
  return matchedTime
    ? matchedTime[0].length === 5
      ? `${matchedTime[0]}:00`
      : matchedTime[0]
    : undefined;
};

export const getPlanScreeningDateTime = (projectDate?: string, projectTime?: string) => {
  if (!projectTime) return undefined;

  const timePart = extractTimePart(projectTime);
  if (!timePart) {
    const parsedTime = dayjs(projectTime);
    return parsedTime.isValid() ? parsedTime : undefined;
  }

  if (!projectDate) {
    const parsedTime = dayjs(projectTime);
    return parsedTime.isValid() ? parsedTime : dayjs(`${dayjs().format("YYYY-MM-DD")}T${timePart}`);
  }

  return dayjs(`${dayjs(projectDate).format("YYYY-MM-DD")}T${timePart}`);
};

export const isPlanScreeningLocked = (projectDate?: string, projectTime?: string) => {
  const screeningDateTime = getPlanScreeningDateTime(projectDate, projectTime);
  if (!screeningDateTime?.isValid()) return false;

  return !screeningDateTime.add(30, "minute").isAfter(dayjs());
};

export function formatNumber(x: number) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function filterEmptyValues<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== null && value !== "" && value !== undefined)
  ) as Partial<T>;
}

export const formatter: InputNumberProps<number>["formatter"] = (value) => {
  const [start, end] = `${value}`.split(".") || [];
  const v = `${start}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${end ? `${v}.${end}` : `${v}`}`;
};

export const sortSeats = (seats: string[]): string[] => {
  return [...seats].sort((a, b) => {
    const matchA = a.match(/^([A-Za-z]+)(\d+)$/);
    const matchB = b.match(/^([A-Za-z]+)(\d+)$/);

    if (!matchA || !matchB) return 0;

    const rowA = matchA[1];
    const rowB = matchB[1];

    const numA = parseInt(matchA[2], 10);
    const numB = parseInt(matchB[2], 10);

    // So sánh row trước
    if (rowA !== rowB) {
      return rowA.localeCompare(rowB);
    }

    // Nếu cùng row → so sánh số
    return numA - numB;
  });
};

export const buildTicketsFromOrder = async (
  data: OrderDetailProps,
  staffName?: string,
  posName?: string
): Promise<PrintTicketPayload[]> => {
  const tickets: PrintTicketPayload[] = [];
  const qrBase64 = await QRCode.toDataURL(data.order.barCode);

  data.order.items.forEach((item) => {
    const seats = sortSeats([
      ...(item.listChairValueF1?.split(",") ?? []),
      ...(item.listChairValueF2?.split(",") ?? []),
      ...(item.listChairValueF3?.split(",") ?? [])
    ])
      .map((s) => s.trim())
      .filter(Boolean);

    seats.forEach((seat) => {
      tickets.push({
        cinemaName: "TRUNG TÂM CHIẾU PHIM QUỐC GIA",
        address: "Số 87 Láng Hạ, Ba Đình, Hà Nội",
        movieName: data.film.filmName,
        showTime: dayjs(data.planScreening.projectTime).format("HH:mm"),
        date: dayjs(data.planScreening.projectDate, "YYYY-MM-DD").format("DD/MM/YYYY"),
        seat: seat,
        room: data.room.name,
        floor: data.room.floor,
        price: formatMoney(item.unitPriceInclTax),
        ticketCode: data.order.barCode,
        qrData: qrBase64,
        posName,
        staffName
      });
    });
  });

  return tickets;
};
