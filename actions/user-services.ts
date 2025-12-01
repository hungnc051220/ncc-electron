import { SignInInput } from "@/lib/schemas";
import { cookies } from "next/headers";
import { getApiBaseUrl } from "@/lib/env";

const BASE_URL = getApiBaseUrl();

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