import { SignInInput } from "@/lib/schemas/user-schema";
import { getApiBaseUrl } from "@/lib/env";

const BASE_URL = getApiBaseUrl();

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
