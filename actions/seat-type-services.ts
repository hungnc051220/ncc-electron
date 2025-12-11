import { getApiBaseUrl } from "@/lib/env";
import { SeatTypeFormInput } from "@/lib/schemas/seat-type-schema";
import { cookies } from "next/headers";

const BASE_URL = getApiBaseUrl();

export const createSeatTypeService = async (data: SeatTypeFormInput) => {
  const url = new URL("/api/pos/position", BASE_URL);
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  return await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ ...data, deleted: false }),
  });
};

export const updateSeatTypeService = async (
  id: number,
  data: SeatTypeFormInput
) => {
  const url = new URL(`/api/pos/position/${id}`, BASE_URL);
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

export const deleteSeatTypeService = async (id: number) => {
  const url = new URL(`/api/pos/position/${id}`, BASE_URL);
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  return await fetch(url.toString(), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
};
