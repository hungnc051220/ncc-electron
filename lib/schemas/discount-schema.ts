import { z } from "zod";

export const discountFormSchema = z
  .object({
    discountName: z.string().min(1, {
      error: "Tên hãng phim là bắt buộc",
    }),
    discountType: z.enum(["amount", "rate"]),
    discountAmount: z
      .number()
      .min(0, { error: "Giá trị phải lớn hơn 0" })
      .optional(),
    discountRate: z
      .number()
      .min(0, { error: "Giá trị phải lớn hơn 0" })
      .max(100, { error: "Giá trị phải nhỏ hơn 100" })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.discountType === "amount" && data.discountAmount == undefined) {
      ctx.addIssue({
        path: ["discountAmount"],
        message: "Giá trị là bắt buộc",
        code: "custom",
      });
    }

    if (data.discountType === "rate" && data.discountRate == undefined) {
      ctx.addIssue({
        path: ["discountRate"],
        message: "Giá trị là bắt buộc",
        code: "custom",
      });
    }
  });

export type DiscountFormInput = z.infer<typeof discountFormSchema>;
