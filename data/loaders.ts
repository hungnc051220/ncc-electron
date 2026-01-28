"use server";

import { getApiBaseUrl } from "@/lib/env";
import {
  ApiResponse,
  BackgroundProps,
  CancellationReasonProps,
  CancellationTicketProps,
  ContractTicketSaleProps,
  CustomerRoleProps,
  DayPartProps,
  DiscountProps,
  ExamineTicketByPlanProps,
  FilmProps,
  HolidayProps,
  MachineSerialProps,
  ManufacturerProps,
  MonthlyReportPlanProps,
  MonthlyReportTicketProps,
  OrderDetailProps,
  PlanCinemaProps,
  PlanFilmProps,
  PlanScreeningDetailProps,
  PlanScreeningProps,
  ReportRevenueFilmByStaffProps,
  ReportU22UsageProps,
  ReportVoucherUsageProps,
  RoomProps,
  SeatTypeProps,
  TicketPriceProps,
  UserProps,
} from "@/types";
import { endOfYear, format, startOfYear } from "date-fns";
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
    { skipEmptyString: true, skipNull: true, encode: false },
  );
  return fetchAPI(url.href, { method: "GET", authToken: accessToken });
};

export const getUser = async (id: number): Promise<UserProps> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL(`/api/pos/staff/${id}`, BASE_URL);
  return fetchAPI(url.href, { method: "GET", authToken: accessToken });
};

export const getCustomerRoles = async (): Promise<CustomerRoleProps[]> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL("/api/pos/customer-role", BASE_URL);
  return fetchAPI(url.href, { method: "GET", authToken: accessToken });
};

export const getPlanScreenings = async (
  query?: string,
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
  date?: string,
): Promise<PlanScreeningProps[]> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL("/api/pos/plan-screenings/get-by-date", BASE_URL);
  url.search = qs.stringify({ date });
  return fetchAPI(url.href, { method: "GET", authToken: accessToken });
};

export const getPlanScreeningDetail = async (
  id: string,
): Promise<PlanScreeningDetailProps> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL(`/api/pos/plan-screenings/${id}`, BASE_URL);
  return fetchAPI(url.href, { method: "GET", authToken: accessToken });
};

export const getFilmScheduling = async (
  query?: string,
): Promise<ApiResponse<PlanCinemaProps>> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL("/api/pos/plan-cinema", BASE_URL);
  if (query) {
    url.search = query;
  }
  return fetchAPI(url.href, { method: "GET", authToken: accessToken });
};

export const getPlanFilms = async (
  query?: string,
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
  query?: string,
): Promise<ApiResponse<FilmProps>> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL("/api/v1/movies", BASE_URL);
  if (query) {
    url.search = query;
  }
  return fetchAPI(url.href, { method: "GET", authToken: accessToken });
};

export const getOrders = async ({
  searchText,
  isOnline,
  barCode,
  page,
  pageSize,
  id,
  phoneNumber,
  email,
  fromDate,
  toDate,
  isInvitation,
  orderStatusId,
}: {
  isOnline?: string;
  searchText?: string;
  barCode?: string;
  page?: number;
  pageSize?: number;
  id?: string;
  phoneNumber?: string;
  email?: string;
  fromDate?: string;
  toDate?: string;
  isInvitation?: boolean;
  orderStatusId?: number;
}): Promise<ApiResponse<OrderDetailProps>> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL("/api/pos/order", BASE_URL);

  const filter: Record<string, unknown> = {};

  if (id) {
    filter.id = id;
  }

  if (phoneNumber) {
    filter.customerPhone = phoneNumber;
  }

  if (email) {
    filter.customerEmail = email;
  }

  if (isOnline) {
    filter.isOnline = isOnline === "ONLINE" ? true : false;
    filter.IsInvitation = false;
    filter.IsContract = false;
    filter.Deleted = 0;
  }

  if (barCode) {
    filter.barCode = barCode;
  }

  if (filter.searchText) {
    filter.keyword = searchText;
  }

  if (fromDate && toDate) {
    filter.createdOnUtc = { between: [fromDate, toDate] };
  }

  if (isInvitation !== undefined) {
    filter.isInvitation = isInvitation;
  }

  if (orderStatusId) {
    filter.orderStatusId = orderStatusId;
  }

  const queryObject: Record<string, unknown> = {
    current: page,
    pageSize,
    sort: "createdOnUtc.desc",
  };

  if (Object.keys(filter).length > 0) {
    queryObject.filter = JSON.stringify(filter);
  }

  url.search = qs.stringify(queryObject, {
    skipEmptyString: true,
    skipNull: true,
    encode: false,
  });
  return fetchAPI(url.href, { method: "GET", authToken: accessToken });
};

export const getOrderDetail = async (id: number): Promise<OrderDetailProps> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL(`/api/pos/order/${id}`, BASE_URL);
  return fetchAPI(url.href, { method: "GET", authToken: accessToken });
};

export const getFilm = async (id: number): Promise<FilmProps> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL(`/api/v1/movies/${id}`, BASE_URL);
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
  },
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
  pageSize = 100,
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
}): Promise<ApiResponse<MachineSerialProps>> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL("/api/pos/print-times", BASE_URL);

  const filter: Record<string, unknown> = {};

  if (year) {
    filter.activeYear = year;
  }

  const queryObject: Record<string, unknown> = {
    current: page,
    pageSize,
    sort: "activeYear.desc",
  };

  if (Object.keys(filter).length > 0) {
    queryObject.filter = JSON.stringify(filter);
  }

  url.search = qs.stringify(queryObject, {
    skipEmptyString: true,
    skipNull: true,
    encode: false,
  });
  return fetchAPI(url.href, { method: "GET", authToken: accessToken });
};

export const getManufacturers = async ({
  page,
  pageSize,
}: {
  page?: number;
  pageSize?: number;
}): Promise<ApiResponse<ManufacturerProps>> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL("/api/pos/manufacturer", BASE_URL);

  const filter: Record<string, unknown> = {};

  const queryObject: Record<string, unknown> = {
    current: page,
    pageSize,
    sort: "createdOnUtc.desc",
  };

  if (Object.keys(filter).length > 0) {
    queryObject.filter = JSON.stringify(filter);
  }

  url.search = qs.stringify(queryObject, {
    skipEmptyString: true,
    skipNull: true,
    encode: false,
  });
  return fetchAPI(url.href, { method: "GET", authToken: accessToken });
};

export const getDiscounts = async ({
  page,
  pageSize,
}: {
  page?: number;
  pageSize?: number;
}): Promise<ApiResponse<DiscountProps>> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL("/api/pos/discount", BASE_URL);

  const filter: Record<string, unknown> = {};
  filter.deleted = false;

  const queryObject: Record<string, unknown> = {
    current: page,
    pageSize,
  };

  if (Object.keys(filter).length > 0) {
    queryObject.filter = JSON.stringify(filter);
  }

  url.search = qs.stringify(queryObject, {
    skipEmptyString: true,
    skipNull: true,
    encode: false,
  });
  return fetchAPI(url.href, { method: "GET", authToken: accessToken });
};

export const getScreeningRooms = async ({
  page,
  pageSize,
}: {
  page?: number;
  pageSize?: number;
}): Promise<ApiResponse<RoomProps>> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL("/api/pos/rooms", BASE_URL);

  const filter: Record<string, unknown> = {};
  filter.deleted = false;

  const queryObject: Record<string, unknown> = {
    current: page,
    pageSize,
  };

  if (Object.keys(filter).length > 0) {
    queryObject.filter = JSON.stringify(filter);
  }

  url.search = qs.stringify(queryObject, {
    skipEmptyString: true,
    skipNull: true,
    encode: false,
  });
  return fetchAPI(url.href, { method: "GET", authToken: accessToken });
};

export const getCancellationReasons = async ({
  page,
  pageSize,
}: {
  page?: number;
  pageSize?: number;
}): Promise<ApiResponse<CancellationReasonProps>> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL("/api/pos/order/cancel-reason", BASE_URL);

  const filter: Record<string, unknown> = {};
  filter.Deleted = false;

  const queryObject: Record<string, unknown> = {
    current: page,
    pageSize,
  };

  if (Object.keys(filter).length > 0) {
    queryObject.filter = JSON.stringify(filter);
  }

  url.search = qs.stringify(queryObject, {
    skipEmptyString: true,
    skipNull: true,
    encode: false,
  });
  return fetchAPI(url.href, { method: "GET", authToken: accessToken });
};

export const getSeatTypes = async ({
  page,
  pageSize,
}: {
  page?: number;
  pageSize?: number;
}): Promise<ApiResponse<SeatTypeProps>> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL("/api/pos/position", BASE_URL);

  const filter: Record<string, unknown> = {};

  const queryObject: Record<string, unknown> = {
    current: page,
    pageSize,
  };

  if (Object.keys(filter).length > 0) {
    queryObject.filter = JSON.stringify(filter);
  }

  url.search = qs.stringify(queryObject, {
    skipEmptyString: true,
    skipNull: true,
    encode: false,
  });
  return fetchAPI(url.href, { method: "GET", authToken: accessToken });
};

export const getTicketPrices = async ({
  page,
  pageSize,
}: {
  page?: number;
  pageSize?: number;
}): Promise<ApiResponse<TicketPriceProps>> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL("/api/pos/pricing", BASE_URL);

  const filter: Record<string, unknown> = {};

  const queryObject: Record<string, unknown> = {
    current: page,
    pageSize,
  };

  if (Object.keys(filter).length > 0) {
    queryObject.filter = JSON.stringify(filter);
  }

  url.search = qs.stringify(queryObject, {
    skipEmptyString: true,
    skipNull: true,
    encode: false,
  });
  return fetchAPI(url.href, { method: "GET", authToken: accessToken });
};

export const getDayParts = async ({
  page,
  pageSize,
}: {
  page?: number;
  pageSize?: number;
}): Promise<ApiResponse<DayPartProps>> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL("/api/pos/day-part", BASE_URL);

  const filter: Record<string, unknown> = {};

  const queryObject: Record<string, unknown> = {
    current: page,
    pageSize,
  };

  if (Object.keys(filter).length > 0) {
    queryObject.filter = JSON.stringify(filter);
  }

  url.search = qs.stringify(queryObject, {
    skipEmptyString: true,
    skipNull: true,
    encode: false,
  });
  return fetchAPI(url.href, { method: "GET", authToken: accessToken });
};

export const getContractTicketSales = async ({
  fromDate,
  toDate,
  page,
  pageSize,
}: {
  fromDate: string;
  toDate: string;
  page?: number;
  pageSize?: number;
}): Promise<ApiResponse<ContractTicketSaleProps>> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL("/api/pos/order-contract", BASE_URL);

  const filter: Record<string, unknown> = {};

  const queryObject: Record<string, unknown> = {
    current: page,
    pageSize,
    fromDate,
    toDate,
  };

  if (Object.keys(filter).length > 0) {
    queryObject.filter = JSON.stringify(filter);
  }

  url.search = qs.stringify(queryObject, {
    skipEmptyString: true,
    skipNull: true,
    encode: false,
  });
  return fetchAPI(url.href, { method: "GET", authToken: accessToken });
};

export const getHolidays = async ({
  page,
  pageSize,
  dateTypeId,
  year = new Date().getFullYear().toString(),
}: {
  page?: number;
  pageSize?: number;
  dateTypeId: number;
  year: string;
}): Promise<ApiResponse<HolidayProps>> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL("/api/pos/date-in-year", BASE_URL);

  const date = new Date(Number(year), 0, 1);
  const startDate = format(startOfYear(date), "yyyy-MM-dd");
  const endDate = format(endOfYear(date), "yyyy-MM-dd");

  const filter: Record<string, unknown> = {
    dateTypeId,
    dateValue: { between: [startDate, endDate] },
  };

  const queryObject: Record<string, unknown> = {
    current: page,
    pageSize,
  };

  if (Object.keys(filter).length > 0) {
    queryObject.filter = JSON.stringify(filter);
  }

  url.search = qs.stringify(queryObject, {
    skipEmptyString: true,
    skipNull: true,
    encode: true,
  });
  return fetchAPI(url.href, { method: "GET", authToken: accessToken });
};

export const getPlanPricing = async ({
  roomId,
  versionCode,
  date,
}: {
  roomId: number;
  versionCode: string;
  date: string;
}): Promise<string[]> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL("/api/pos/pricing/plan-pricing", BASE_URL);
  return fetchAPI(url.href, {
    method: "POST",
    body: { roomId, versionCode, date },
    authToken: accessToken,
  });
};

export const getCancellationTickets = async ({
  filmId,
  userId,
  fromDate,
  toDate,
  page,
  pageSize,
}: {
  filmId?: string;
  userId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}): Promise<ApiResponse<CancellationTicketProps>> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL("/pos/cancel-ticket", BASE_URL);

  const filter: Record<string, unknown> = {};

  if (filmId) {
    filter.filmId = Number(filmId);
  }

  if (userId) {
    filter.userId = Number(userId);
  }

  if (fromDate && toDate) {
    filter.createdOnUtc = { between: [fromDate, toDate] };
  }

  const queryObject: Record<string, unknown> = {
    current: page,
    pageSize,
    sort: "createdOnUtc.desc",
  };

  if (Object.keys(filter).length > 0) {
    queryObject.filter = JSON.stringify(filter);
  }

  url.search = qs.stringify(queryObject, {
    skipEmptyString: true,
    skipNull: true,
    encode: false,
  });
  return fetchAPI(url.href, { method: "GET", authToken: accessToken });
};

export const getBackgrounds = async (): Promise<BackgroundProps[]> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL(
    `/api/pos/invitation-ticket-histories/background-images`,
    BASE_URL,
  );
  return fetchAPI(url.href, { method: "GET", authToken: accessToken });
};

export const getReportRevenueByFilm = async ({
  fromDate,
  toDate,
  userId,
  manufacturerId,
  filmId,
}: {
  fromDate?: string;
  toDate?: string;
  userId?: number;
  manufacturerId?: number;
  filmId?: number;
}): Promise<ReportRevenueFilmByStaffProps> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL("/api/reports/revenue-by-film", BASE_URL);
  const body = {
    storeId: 0,
    fromDate,
    toDate,
    manufacturerId,
    filmId,
    userId,
  };
  return fetchAPI(url.href, { method: "POST", authToken: accessToken, body });
};

export const getExamineTicketByPlan = async ({
  fromDate,
  toDate,
  userId,
  manufacturerId,
  filmId,
}: {
  fromDate?: string;
  toDate?: string;
  userId?: number;
  manufacturerId?: number;
  filmId?: number;
}): Promise<ExamineTicketByPlanProps> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL("/api/reports/examine-ticket-by-plan", BASE_URL);
  const body = {
    storeId: 0,
    fromDate,
    toDate,
    manufacturerId,
    filmId,
    userId,
  };
  return fetchAPI(url.href, { method: "POST", authToken: accessToken, body });
};

export const getVoucherUsage = async ({
  fromDate,
  toDate,
  userId,
}: {
  fromDate?: string;
  toDate?: string;
  userId?: number;
}): Promise<ReportVoucherUsageProps> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL("/api/reports/voucher-usage", BASE_URL);
  const body = {
    storeId: 0,
    fromDate,
    toDate,
    userId,
  };
  return fetchAPI(url.href, { method: "POST", authToken: accessToken, body });
};

export const getU22Usage = async ({
  fromDate,
  toDate,
  userId,
}: {
  fromDate?: string;
  toDate?: string;
  userId?: number;
}): Promise<ReportU22UsageProps> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL("/api/reports/u22-usage", BASE_URL);
  const body = {
    storeId: 0,
    fromDate,
    toDate,
    userId,
  };
  return fetchAPI(url.href, { method: "POST", authToken: accessToken, body });
};

export const getMonthlyReport = async ({
  fromDate,
  toDate,
  reportType,
}: {
  fromDate?: string;
  toDate?: string;
  userId?: number;
  reportType: string;
}): Promise<MonthlyReportPlanProps | MonthlyReportTicketProps> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const url = new URL("/api/reports/monthly-report", BASE_URL);
  const body = {
    storeId: 0,
    fromDate,
    toDate,
    reportType,
  };
  return fetchAPI(url.href, { method: "POST", authToken: accessToken, body });
};
