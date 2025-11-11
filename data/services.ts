import { SignInInput } from "@/lib/schemas";
import { BookingTicketBodyProps } from "@/types";
import { cookies } from "next/headers";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const signInService = async ({ username, password }: SignInInput) => {
  const url = new URL("/api/pos/staff/login", BASE_URL);

  return await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });
};

export const createUserService = async (data: SignInInput) => {
  const url = new URL("/api/pos/staff", BASE_URL);
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

export const updateUserService = async (
  id: number,
  data: {
    roleIds: number[];
    username: string;
    customerFirstName: string;
    customerLastName: string;
    manufacturerId: number;
    address?: string;
    email: string;
    mobile: string;
    password?: string;
    confirmPassword?: string;
  }
) => {
  const url = new URL(`/api/pos/staff/${id}`, BASE_URL);
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

export const deleteUserService = async (id: number) => {
  const url = new URL(`/api/pos/staff/${id}`, BASE_URL);
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  return await fetch(url.toString(), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
};

export const bookingTicketService = async (data: BookingTicketBodyProps) => {
  const url = new URL("/api/pos/order", BASE_URL);
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
  desciption: string;
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
