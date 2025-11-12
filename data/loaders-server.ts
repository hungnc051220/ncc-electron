"use server";

import {
  ApiResponse,
  CustomerRoleProps,
  FilmProps,
  PlanCinemaProps,
  PlanFilmProps,
  PlanScreeningDetailProps,
  PlanScreeningProps,
  UserProps,
} from "@/types";
import { cookies } from "next/headers";
import qs from "query-string";
import { fetchAPI } from "./fetch-api";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const onRefreshToken = async (refreshToken: string) => {
  const url = new URL("/api/pos/staff/refresh-token", BASE_URL);

  return await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
  });
};

export const getUsers = async ({
  roleId,
  searchText,
  page,
  pageSize,
}: {
  roleId?: string;
  searchText?: string;
  page?: number;
  pageSize?: number;
}): Promise<ApiResponse<UserProps>> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL("/api/pos/staff", BASE_URL);
  url.search = qs.stringify(
    {
      filter: JSON.stringify({ roleId, keyword: searchText }),
      current: page,
      pageSize,
    },
    { skipEmptyString: true, skipNull: true, encode: false }
  );
  return fetchAPI(url.href, { method: "GET", authToken: accessToken });
};

export const getCustomerRoles = async (): Promise<CustomerRoleProps[]> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL("/api/pos/customer-role", BASE_URL);
  return fetchAPI(url.href, { method: "GET", authToken: accessToken });
};

export const getPlanScreenings = async (
  query?: string
): Promise<ApiResponse<PlanScreeningDetailProps>> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL("/api/pos/plan-screenings", BASE_URL);
  if (query) {
    url.search = query;
  }
  return fetchAPI(url.href, { method: "GET", authToken: accessToken });
};

export const getPlanScreeningsByDate = async (): Promise<
  PlanScreeningProps[]
> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL("/api/pos/plan-screenings/get-by-date", BASE_URL);
  url.search = qs.stringify({ date: "2025-10-16" });
  return fetchAPI(url.href, { method: "GET", authToken: accessToken });
};

export const getPlanScreeningDetail = async (
  id: string
): Promise<PlanScreeningDetailProps> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL(`/api/pos/plan-screenings/${id}`, BASE_URL);
  return fetchAPI(url.href, { method: "GET", authToken: accessToken });
};

export const getFilmScheduling = async (): Promise<
  ApiResponse<PlanCinemaProps>
> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL("/api/pos/plan-cinema", BASE_URL);
  url.search = qs.stringify({ current: 1, pageSize: 10000 });
  return fetchAPI(url.href, { method: "GET", authToken: accessToken });
};

export const getPlanFilms = async (
  query?: string
): Promise<ApiResponse<PlanFilmProps>> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL("/api/pos/plan-film", BASE_URL);
  if (query) {
    url.search = query;
  }
  return fetchAPI(url.href, { method: "GET", authToken: accessToken });
};

export const getFilms = async (
  query?: string
): Promise<ApiResponse<FilmProps>> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL("/api/v1/movies", BASE_URL);
  if (query) {
    url.search = query;
  }
  return fetchAPI(url.href, { method: "GET", authToken: accessToken });
};
