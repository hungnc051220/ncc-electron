import { BookingTicketBodyProps, CreateQrCodeBodyProps } from "@/types";
import { cookies } from "next/headers";
import { getApiBaseUrl } from "@/lib/env";

const BASE_URL = getApiBaseUrl();

export const bookingTicketService = async (data: BookingTicketBodyProps) => {
  const url = new URL("/api/pos/order", BASE_URL);
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  return await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ ...data }),
  });
};

export const createQrCodeService = async (data: CreateQrCodeBodyProps) => {
  const url = new URL("/api/pos/order/create-qr", BASE_URL);
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  return await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ ...data }),
  });
};
