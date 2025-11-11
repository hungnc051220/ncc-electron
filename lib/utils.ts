import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const decodeToken = (token: string) => {
  try {
    const payload = token.split(".")[1];
    const decodedPayload = JSON.parse(
      Buffer.from(payload, "base64").toString("utf-8")
    );
    return decodedPayload;
  } catch (error) {
    console.error("Invalid token", error);
    return null;
  }
};

export const formatMoney = (price: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    price
  );
