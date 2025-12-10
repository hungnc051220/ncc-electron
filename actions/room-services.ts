import { getApiBaseUrl } from "@/lib/env";
import { RoomFormInput } from "@/lib/schemas/room-schema";
import { cookies } from "next/headers";

const BASE_URL = getApiBaseUrl();

export const createRoomService = async (data: RoomFormInput) => {
  const url = new URL("/api/pos/rooms", BASE_URL);
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

export const updateRoomService = async (
  id: number,
  data: {
    name: string;
    numberOfFloor: number;
    ruleOrder: string;
    wideSizeF1?: number;
    deepSizeF1?: number;
    wideSizeF2?: number;
    deepSizeF2?: number;
    wideSizeF3?: number;
    deepSizeF3?: number;
  }
) => {
  const url = new URL(`/api/pos/rooms/${id}`, BASE_URL);
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

export const deleteRoomService = async (id: number) => {
  const url = new URL(`/api/pos/rooms/${id}`, BASE_URL);
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  return await fetch(url.toString(), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
};
