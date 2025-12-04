"use server";

import { getApiBaseUrl } from "@/lib/env";
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

const BASE_URL = getApiBaseUrl();

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

export const getPlanScreeningsByDate = async (
  date?: string
): Promise<PlanScreeningProps[]> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL("/api/pos/plan-screenings/get-by-date", BASE_URL);
  url.search = qs.stringify({ date });
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

export const onSelectingChairs = async (
  operation: "add" | "remove",
  body: {
    planScreenId: number;
    posName: string;
    selectingChairIndexF1?: string;
    selectingChairIndexF2?: string;
    selectingChairIndexF3?: string;
  }
): Promise<ApiResponse<FilmProps>> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL(`/api/pos/seat/selecting-chairs/${operation}`, BASE_URL);
  return fetchAPI(url.href, {
    method: "POST",
    authToken: accessToken,
    body,
  });
};

export const getFilmsList = async ({
  filmName,
  manufacturerId,
  page,
  pageSize,
  premieredDay,
  tabCode,
}: {
  filmName?: string;
  manufacturerId?: number;
  page?: number;
  pageSize?: number;
  premieredDay?: string;
  tabCode: string;
}): Promise<ApiResponse<FilmProps>> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL("/api/pos/v1/films", BASE_URL);

  const filter: Record<string, unknown> = {};

  if (filmName) {
    filter.filmName = { like: `%${filmName}%` };
  }

  if (typeof manufacturerId === "number") {
    filter.manufacturerId = manufacturerId;
  }

  if (premieredDay) {
    filter.premieredDay = premieredDay;
  }

  const queryObject: Record<string, unknown> = {
    current: page,
    pageSize,
    tabCode,
    sort: "createdOnUtc.desc",
  };

  if (Object.keys(filter).length > 0) {
    queryObject.filter = JSON.stringify(filter);
  }

  const queryString = qs.stringify(queryObject, {
    skipEmptyString: true,
    skipNull: true,
    encode: false,
  });

  url.search = encodeURI(queryString);
  return fetchAPI(url.href, { method: "GET", authToken: accessToken });
};

export const onUploadFile = async (formData: FormData) => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL("/api/pos/v1/attachments/admin/upload", BASE_URL);

  return await fetch(url.toString(), {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  });
};

export const getMachineSerials = async ({
  year,
  page,
  pageSize,
}: {
  year?: string;
  page?: number;
  pageSize?: number;
}): Promise<ApiResponse<UserProps>> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL("/api/pos/print-times", BASE_URL);
  url.search = qs.stringify(
    {
      filter: JSON.stringify({ year }),
      current: page,
      pageSize,
    },
    { skipEmptyString: true, skipNull: true, encode: false }
  );
  return fetchAPI(url.href, { method: "GET", authToken: accessToken });
};
