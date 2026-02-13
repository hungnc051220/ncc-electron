import type { InputNumberProps } from "antd";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
