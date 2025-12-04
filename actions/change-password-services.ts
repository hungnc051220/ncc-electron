interface ChangePasswordServiceProps {
  oldPassword: string;
  newPassword: string;
  accessToken: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const changePasswordService = async ({
  oldPassword,
  newPassword,
  accessToken,
}: ChangePasswordServiceProps) => {
  const url = new URL("/api/pos/staff/change-password", BASE_URL);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      password: oldPassword,
      new_password: newPassword,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Đã xảy ra lỗi khi gọi API đổi mật khẩu.");
  }

  return response.json();
};
