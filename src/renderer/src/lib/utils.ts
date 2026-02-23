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

export const buildTicketsFromOrder = async (
  data: OrderDetailProps
): Promise<PrintTicketPayload[]> => {
  const tickets: PrintTicketPayload[] = [];
  const qrBase64 = await QRCode.toDataURL(data.order.barCode);

  data.order.items.forEach((item) => {
    const seats = [
      ...(item.listChairValueF1?.split(",") ?? []),
      ...(item.listChairValueF2?.split(",") ?? []),
      ...(item.listChairValueF3?.split(",") ?? [])
    ]
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
        qrData: qrBase64
      });
    });
  });

  return tickets;
};
