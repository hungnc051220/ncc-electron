import { z } from "zod";

export const addSchedulingFormSchema = z.object({
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
  priceOfPosition1: z
    .any()
    .refine((val) => val !== undefined && Number(val) >= 1, {
      message: "Giá vé không hợp lệ",
    })
    .transform((val) => Number(val)),
  priceOfPosition2: z
    .any()
    .refine((val) => val !== undefined && Number(val) >= 1, {
      message: "Giá vé không hợp lệ",
    })
    .transform((val) => Number(val)),
  priceOfPosition3: z
    .any()
    .refine((val) => val !== undefined && Number(val) >= 1, {
      message: "Giá vé không hợp lệ",
    })
    .transform((val) => Number(val)),
  priceOfPosition4: z
    .any()
    .refine((val) => val !== undefined && Number(val) >= 1, {
      message: "Giá vé không hợp lệ",
    })
    .transform((val) => Number(val)),
});

export type AddSchedulingFormInput = z.infer<typeof addSchedulingFormSchema>;
