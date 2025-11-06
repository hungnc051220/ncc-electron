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
  mobile: z.string().regex(/^0\d{9}$/, "Số điện thoại không hợp lệ"),
  username: z.string().min(1, { error: "Tên người dùng là bắt buộc" }),
  password: z.string().min(1, { error: "Mật khẩu là bắt buộc" }),
});

export const updateUserFormSchema = userFormSchema.extend({
  password: z.string().optional(),
});

export const getUserFormInputSchema = (isEdit: boolean) =>
  isEdit ? updateUserFormSchema : userFormSchema;

export type SignInInput = z.infer<typeof signInSchema>;
export type UserFormInput = z.infer<ReturnType<typeof getUserFormInputSchema>>;
