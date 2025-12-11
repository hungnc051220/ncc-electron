import { z } from "zod";

export const seatTypeFormSchema = z.object({
  positionCode: z.string().min(1, {
    error: "Mã vị trí là bắt buộc",
  }),
  name: z.string().min(1, {
    error: "Tên loại ghế là bắt buộc",
  }),
  color: z.string().optional(),
  isSeat: z.boolean(),
  isDefault: z.boolean(),
  pictureUrl: z.string().optional(),
});

export type SeatTypeFormInput = z.infer<typeof seatTypeFormSchema>;
