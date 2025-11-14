import { SignInInput } from "@/lib/schemas";

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
