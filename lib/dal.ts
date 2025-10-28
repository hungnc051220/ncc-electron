import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";

export const verifySession = cache(async () => {
  const accessToken = (await cookies()).get("access_token");
  const refreshToken = (await cookies()).get("refresh_token");
  if (!accessToken || !refreshToken) {
    redirect("/sign-in");
  }

  return {
    isAuth: true,
    accessToken: accessToken.value,
    refreshToken: refreshToken.value,
  };
});
