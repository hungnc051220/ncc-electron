import { getApiBaseUrl } from "@/lib/env";
import { ShowtimeSlotFormInput } from "@/lib/schemas/showtime-slot-schema";
import { cookies } from "next/headers";

const BASE_URL = getApiBaseUrl();

export const createShowtimeSlotService = async (data: ShowtimeSlotFormInput) => {
  const url = new URL("/api/pos/day-part", BASE_URL);
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

export const updateShowtimeSlotService = async (
  id: number,
  data: ShowtimeSlotFormInput
) => {
  const url = new URL(`/api/pos/day-part/${id}`, BASE_URL);
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  return await fetch(url.toString(), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ ...data }),
  });
};

export const deleteShowtimeSlotService = async (id: number) => {
  const url = new URL(`/api/pos/day-part/${id}`, BASE_URL);
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  return await fetch(url.toString(), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
};

