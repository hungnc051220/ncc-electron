import { getApiBaseUrl } from "@/lib/env";
import { cookies } from "next/headers";

const BASE_URL = getApiBaseUrl();

export type CreatePlanScreeningPayload = {
  planCinemaId: number;
  filmId: number;
  roomId: number;
  duration?: string;
  projectDate: string;
  projectTime: string;
  endTime?: string;
  versionCode?: string;
  priceOfPosition1?: string;
  priceOfPosition2?: string;
  priceOfPosition3?: string;
  priceOfPosition4?: string;
};

export const createPlanScreeningService = async (
  data: CreatePlanScreeningPayload
) => {
  const url = new URL("/api/pos/plan-screenings", BASE_URL);
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

export const deletePlanScreeningService = async (id: number) => {
  const url = new URL(`/api/pos/plan-screenings/${id}`, BASE_URL);
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  return await fetch(url.toString(), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
};
