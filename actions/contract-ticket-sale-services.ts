import { getApiBaseUrl } from "@/lib/env";
import { ContractTicketSaleFormInput } from "@/lib/schemas/contract-ticket-sale-schema";
import { UpdateSeatContractTicketSaleBodyProps } from "@/types";
import { cookies } from "next/headers";

const BASE_URL = getApiBaseUrl();

export const createContractTicketSaleService = async (
  data: ContractTicketSaleFormInput
) => {
  const url = new URL("/api/pos/order-contract", BASE_URL);
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

export const updateContractTicketSaleService = async (
  id: number,
  data: ContractTicketSaleFormInput
) => {
  const url = new URL(`/api/pos/order-contract/${id}`, BASE_URL);
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  return await fetch(url.toString(), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ ...data }),
  });
};

export const updateSeatContractTicketSaleService = async (
  id: number,
  data: UpdateSeatContractTicketSaleBodyProps
) => {
  const url = new URL(`/api/pos/order-contract/${id}/set-seats`, BASE_URL);
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  console.log(url.toString())

  console.log("data", data)

  return await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ ...data }),
  });
};

export const deleteContractTicketSaleService = async (id: number) => {
  const url = new URL(`/api/pos/order-contract/${id}`, BASE_URL);
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  return await fetch(url.toString(), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
};
