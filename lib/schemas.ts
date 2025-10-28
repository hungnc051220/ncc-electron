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

export type SignInInput = z.infer<typeof signInSchema>;
