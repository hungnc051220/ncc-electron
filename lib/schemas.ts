import { z } from "zod";

export const signInSchema = z.object({
  username: z
    .string()
    .min(2, {
      error: "Tên đăng nhập là bắt buộc",
    })
    .trim(),
  password: z
    .string()
    .min(2, {
      error: "Mật khẩu là bắt buộc",
    })
    .trim(),
});

export const userFormSchema = z.object({
  roleIds: z.array(z.number()).min(1, { error: "Nhóm người dùng là bắt buộc" }),
  customerFirstName: z.string().min(1, {
    error: "Họ là bắt buộc",
  }),
  customerLastName: z.string().min(1, {
    error: "Tên là bắt buộc",
  }),
  manufacturerId: z.number(),
  address: z.string().optional(),
  email: z.email("Email không đúng định dạng").min(1, {
    error: "Email là bắt buộc",
  }),
  mobile: z.string().regex(/^0\d{9}$/, "Số điện thoại không hợp lệ").optional(),
  username: z.string().min(1, { error: "Tên người dùng là bắt buộc" }),
  password: z.string().min(1, { error: "Mật khẩu là bắt buộc" }),
  isHidden: z.boolean().optional().nullable(),
});

export const updateUserFormSchema = userFormSchema.extend({
  password: z.string().optional(),
});

export const getUserFormInputSchema = (isEdit: boolean) =>
  isEdit ? updateUserFormSchema : userFormSchema;

export type SignInInput = z.infer<typeof signInSchema>;
export type UserFormInput = z.infer<ReturnType<typeof getUserFormInputSchema>>;

// Kế hoạch chiếu phim
export const planCinemaFormSchema = z.object({
  name: z.string().min(1, { error: "Tên kế hoạch là bắt buộc" }).trim(),
  // API yêu cầu trường 'desciption' (chính tả theo backend)
  desciption: z.string().min(1, { error: "Mô tả kế hoạch là bắt buộc" }).trim(),
});

export type PlanCinemaFormInput = z.infer<typeof planCinemaFormSchema>;

export const changePasswordFormSchema = z
  .object({
    oldPassword: z
      .string()
      .min(1, { message: "Mật khẩu cũ là bắt buộc" })
      .trim(),
    newPassword: z
      .string()
      .min(6, { message: "Mật khẩu mới phải có ít nhất 6 ký tự" })
      .trim(),
    confirmPassword: z
      .string()
      .min(1, { message: "Xác nhận mật khẩu là bắt buộc" })
      .trim(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

export const resetPasswordFormSchema = z.object({
  password: z
    .string()
    .min(6, { message: "Mật khẩu phải có ít nhất 6 ký tự" })
    .trim(),
});
