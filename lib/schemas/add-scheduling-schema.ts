import { z } from "zod";

export const addSchedulingFormSchema = z
  .object({
    filmId: z
      .any()
      .refine((val) => val !== undefined, {
        message: "Tên phim là bắt buộc",
      })
      .transform((val) => Number(val)),
    roomId: z
      .any()
      .refine((val) => val !== undefined, {
        message: "Phòng chiếu là bắt buộc",
      })
      .transform((val) => Number(val)),
    duration: z.string().optional(),
    projectDate: z.date(),
    projectTime: z.string(),
    endTime: z.string().optional(),
    versionCode: z.string().optional(),
    priceOfPosition1: z.string().optional(),
    priceOfPosition2: z.string().optional(),
    priceOfPosition3: z.string().optional(),
    priceOfPosition4: z.string().optional(),
  })
  .refine(
    (data) =>
      [
        data.priceOfPosition1,
        data.priceOfPosition2,
        data.priceOfPosition3,
        data.priceOfPosition4,
      ].some((price) => price && price.trim() !== ""),
    {
      message: "Phải có ít nhất 1 giá vé",
      path: ["priceOfPosition1"], // gắn lỗi vào field đầu tiên
    }
  );

export type AddSchedulingFormInput = z.infer<typeof addSchedulingFormSchema>;
