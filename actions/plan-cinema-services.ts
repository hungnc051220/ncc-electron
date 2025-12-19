import { cookies } from "next/headers";
import { getApiBaseUrl } from "@/lib/env";

const BASE_URL = getApiBaseUrl();

export const deletePlanCinemaService = async (id: number) => {
  const url = new URL(`/api/pos/plan-cinema/${id}`, BASE_URL);
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  return await fetch(url.toString(), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
};

export const createPlanCinemaService = async (data: {
  name: string;
  desciption?: string;
}) => {
  const url = new URL("/api/pos/plan-cinema", BASE_URL);
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

export const approveRejectPlanCinemaService = async (data: {
  id: number;
  isApproved: boolean;
}) => {
  const url = new URL("/api/pos/plan-cinema/approve-reject", BASE_URL);
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

export const updatePlanCinemaService = async (data: {
  id: number;
  status: number;
}) => {
  const url = new URL(`/api/pos/plan-cinema/${data.id}`, BASE_URL);
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

export const addPlanFilmService = async (data: {
  data: { filmId: number; planCinemaId: number; order: number }[];
}) => {
  const url = new URL("/api/pos/plan-film", BASE_URL);
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

export const deletePlanFilmService = async (data: {
  data: { filmId: number; planCinemaId: number; order: number }[];
}) => {
  const url = new URL("/api/pos/plan-film", BASE_URL);
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  return await fetch(url.toString(), {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ ...data }),
  });
};
