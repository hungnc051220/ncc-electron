import { z } from "zod";

export const ticketPriceFormSchema = z.object({
  versionCode: z.string().min(1, {
    message: "Mã phiên bản là bắt buộc",
  }),
  daypartId: z
    .any()
    .refine((val) => val !== undefined, {
      message: "Ca chiếu là bắt buộc",
    })
    .transform((val) => Number(val)),
  positionId: z
    .any()
    .refine((val) => val !== undefined, {
      message: "Loại ghế là bắt buộc",
    })
    .transform((val) => Number(val)),
  price: z
    .any()
    .refine((val) => val !== undefined && Number(val) >= 1, {
      message: "Giá vé không hợp lệ",
    })
    .transform((val) => Number(val)),
});

export type TicketPriceFormInput = z.infer<typeof ticketPriceFormSchema>;
