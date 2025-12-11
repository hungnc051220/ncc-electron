import { getApiBaseUrl } from "@/lib/env";
import { CancellationReasonFormInput } from "@/lib/schemas/cancellation-reason-schema";
import { cookies } from "next/headers";

const BASE_URL = getApiBaseUrl();

export const createCancellationReasonService = async (data: CancellationReasonFormInput) => {
  const url = new URL("/api/pos/order/cancel-reason", BASE_URL);
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

export const updateCancellationReasonService = async (
  id: number,
  data: CancellationReasonFormInput
) => {
  const url = new URL(`/api/pos/order/cancel-reason/${id}`, BASE_URL);
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

export const deleteCancellationReasonService = async (id: number) => {
  const url = new URL(`/api/pos/order/cancel-reason/${id}`, BASE_URL);
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  return await fetch(url.toString(), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
};
