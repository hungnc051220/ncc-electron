import { getApiBaseUrl } from "@/lib/env";
import { HolidayFormInput } from "@/lib/schemas/holiday-schema";
import { cookies } from "next/headers";

const BASE_URL = getApiBaseUrl();

export const createHolidayService = async (
  data: HolidayFormInput & { year: number; dateTypeId: number }
) => {
  const url = new URL("/api/pos/date-in-year/bulk-create", BASE_URL);
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

export const deleteHolidayService = async (id: string) => {
  const url = new URL(`/api/pos/date-in-year/${id}`, BASE_URL);
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  return await fetch(url.toString(), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
};
