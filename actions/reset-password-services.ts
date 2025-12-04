"use server";

interface ResetPasswordServiceProps {
  userId: string;
  accessToken: string;
}
const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const resetPasswordService = async ({ userId, accessToken }: ResetPasswordServiceProps) => {
  const url = new URL("/api/v1/user/reset-password", BASE_URL);

  return await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ userId }),
  });
};