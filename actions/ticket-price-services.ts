import { getApiBaseUrl } from "@/lib/env";
import { TicketPriceFormInput } from "@/lib/schemas/ticket-price-schema";
import { cookies } from "next/headers";

const BASE_URL = getApiBaseUrl();

export const createTicketPriceService = async (data: TicketPriceFormInput) => {
  const url = new URL("/api/pos/pricing", BASE_URL);
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

export const updateTicketPriceService = async (
  id: number,
  data: TicketPriceFormInput
) => {
  const url = new URL(`/api/pos/pricing/${id}`, BASE_URL);
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  return await fetch(url.toString(), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ ...data }),
  });
};

export const deleteTicketPriceService = async (id: number) => {
  const url = new URL(`/api/pos/pricing/${id}`, BASE_URL);
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  return await fetch(url.toString(), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
};

