"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { resetPasswordService } from "./reset-password-services";

type ActionStateProps = {
  formData: Record<string, string> | null;
  fieldErrors: Record<string, string[]> | null;
  success: boolean;
  error: string | null;
};

const ResetFormSchema = z.object({
  userId: z.string().min(1, "Tên người dùng không được để trống"),
});

export const resetPasswordAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const validatedFields = ResetFormSchema.safeParse({
    userId: formData.get("userId"),
  });

  if (!validatedFields.success) {
    return {
      ...prevState,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
      error: null,
      success: false,
    };
  }

  const { userId } = validatedFields.data;

  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) {
    return { ...prevState, success: false, error: "Unauthorized: Missing token." };
  }

  try {
    const response = await resetPasswordService({ userId, accessToken });

    if (!response.ok) {
      const errorData = await response.json();
      return { ...prevState, success: false, error: errorData.message || "Đặt lại mật khẩu thất bại." };
    }

    return { formData: null, fieldErrors: null, success: true, error: null };

  } catch (error) {
    return { ...prevState, success: false, error: "Lỗi kết nối đến máy chủ." };
  }
};