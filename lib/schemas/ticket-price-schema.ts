import { z } from "zod";

export const ticketPriceFormSchema = z.object({
  versionCode: z.string().min(1, {
    message: "Mã phiên bản là bắt buộc",
  }),
  daypartId: z.number().min(1, {
    message: "Ca chiếu là bắt buộc",
  }),
  positionId: z.number().min(1, {
    message: "Vị trí là bắt buộc",
  }),
  price: z.number().min(0, {
    message: "Giá vé phải lớn hơn hoặc bằng 0",
  }),
});

export type TicketPriceFormInput = z.infer<typeof ticketPriceFormSchema>;

