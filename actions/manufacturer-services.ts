import { getApiBaseUrl } from "@/lib/env";
import { ManufacturerFormInput } from "@/lib/schemas/manufacturer-schema";
import { cookies } from "next/headers";

const BASE_URL = getApiBaseUrl();

export const createManufacturerService = async (data: ManufacturerFormInput) => {
  const url = new URL("/api/pos/manufacturer", BASE_URL);
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

export const updateManufacturerService = async (
  id: number,
  data: {
    name: string;
    fullName: string;
    bankName?: string;
    phoneNumber?: string;
    manufacturerTemplateId?: number;
    acountBank?: string;
    addressBank?: string;
    address?: string;
    fax?: string;
    url?: string;
  }
) => {
  const url = new URL(`/api/pos/manufacturer/${id}`, BASE_URL);
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

export const deleteManufacturerService = async (id: number) => {
  const url = new URL(`/api/pos/manufacturer/${id}`, BASE_URL);
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  return await fetch(url.toString(), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
};
