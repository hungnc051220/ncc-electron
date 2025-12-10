import { getApiBaseUrl } from "@/lib/env";
import { DiscountFormInput } from "@/lib/schemas/discount-schema";
import { cookies } from "next/headers";

const BASE_URL = getApiBaseUrl();

export const createDiscountService = async (data: DiscountFormInput) => {
  const url = new URL("/api/pos/discount", BASE_URL);
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

export const updateDiscountService = async (
  id: number,
  data: {
    discountName: string;
    discountAmount?: number;
    discountRate?: number;
  }
) => {
  const url = new URL(`/api/pos/discount/${id}`, BASE_URL);
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  return await fetch(url.toString(), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ ...data, deleted: false }),
  });
};

export const deleteDiscountService = async (id: number) => {
  const url = new URL(`/api/pos/discount/${id}`, BASE_URL);
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  return await fetch(url.toString(), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
};
