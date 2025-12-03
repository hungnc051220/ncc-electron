import { FilmFormInput } from "@/lib/schemas/film-schema";
import { cookies } from "next/headers";
import { getApiBaseUrl } from "@/lib/env";

const BASE_URL = getApiBaseUrl();

export const createFilmService = async (data: FilmFormInput) => {
  const url = new URL("/api/pos/v1/films", BASE_URL);
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  return await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  });
};

export const updateFilmService = async (data: FilmFormInput) => {
  const url = new URL(`/api/pos/v1/films`, BASE_URL);
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  return await fetch(url.toString(), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  });
};

export const deleteFilmService = async (id: number) => {
  const url = new URL(`/api/pos/v1/films/${id}`, BASE_URL);
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  return await fetch(url.toString(), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
};