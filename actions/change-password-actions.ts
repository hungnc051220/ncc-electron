"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { changePasswordService } from "./change-password-services";

const changePasswordFormSchema = z
  .object({
    oldPassword: z.string().min(1, "Mật khẩu cũ không được để trống."),
    newPassword: z.string().min(1, "Mật khẩu mới không được để trống."),
    confirmPassword: z.string().min(1, "Xác nhận mật khẩu không được để trống."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu mới và xác nhận mật khẩu không khớp.",
    path: ["confirmPassword"],
  })
  .refine((data) => data.oldPassword !== data.newPassword, {
    message: "Mật khẩu mới không được trùng với mật khẩu cũ.",
    path: ["newPassword"],
  });
export type ActionStateProps = {
  fieldErrors?: Record<string, string[]> | null;
  success: boolean;
  error?: string | null;
  message?: string | null;
};
export const changePasswordAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const rawData = {
    oldPassword: formData.get("oldPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const validatedFields = changePasswordFormSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
      error: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.",
    };
  }
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) {
    return { success: false, error: "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại." };
  }
  const { oldPassword, newPassword } = validatedFields.data;

  try {
    await changePasswordService({ oldPassword, newPassword, accessToken });
    return { success: true, message: "Đổi mật khẩu thành công." };
  } catch (error: any) {
    return { success: false, error: error.message || "Đổi mật khẩu thất bại." };
  }
};