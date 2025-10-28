"use server";

import { signInSchema } from "@/lib/schemas";
import { deleteSession } from "@/lib/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signInService } from "./services";

export type SignInActionState = {
  formData: Record<string, string> | null;
  fieldErrors: Record<string, string[]> | null;
  success: boolean;
  error: string | null;
};

export const signInAction = async (
  prevState: SignInActionState,
  formData: FormData
): Promise<SignInActionState> => {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  const validatedFields = signInSchema.safeParse({ username, password });

  if (!validatedFields.success) {
    return {
      ...prevState,
      formData: { username, password },
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const dataToSend = { ...validatedFields.data };

  const res = await signInService(dataToSend);
  const data = await res.json();

  if (!res.ok) {
    return {
      ...prevState,
      success: false,
      error: data.message || "Đăng nhập thất bại",
    };
  }

  const cookieStore = await cookies();
  cookieStore.set("access_token", data.access_token, {
    httpOnly: true,
    secure: true,
    path: "/",
    sameSite: "lax",
    maxAge: data.expires_in,
  });

  cookieStore.set("refresh_token", data.refresh_token, {
    httpOnly: true,
    secure: true,
    path: "/",
    sameSite: "lax",
    maxAge: data.refresh_expires_in,
  });

  redirect("/");
};

export const signOutAction = async () => {
  await deleteSession();
  redirect("/sign-in");
};
