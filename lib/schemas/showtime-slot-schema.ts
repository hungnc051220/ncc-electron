import { z } from "zod";

export const showtimeSlotFormSchema = z
  .object({
    dateTypeId: z.number().min(1, {
      message: "Loại ngày là bắt buộc",
    }),
    name: z.string().min(1, {
      message: "Tên là bắt buộc",
    }),
    fromTime: z.string().min(1, {
      message: "Thời gian bắt đầu là bắt buộc",
    }),
    toTime: z.string().min(1, {
      message: "Thời gian kết thúc là bắt buộc",
    }),
  })
  .refine(
    (data) => {
      if (!data.fromTime || !data.toTime) return true;
      // Convert time strings (HH:mm) to minutes for comparison
      const [fromHours, fromMinutes] = data.fromTime.split(":").map(Number);
      const [toHours, toMinutes] = data.toTime.split(":").map(Number);
      const fromTotalMinutes = fromHours * 60 + fromMinutes;
      const toTotalMinutes = toHours * 60 + toMinutes;
      return fromTotalMinutes < toTotalMinutes;
    },
    {
      message: "Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc",
      path: ["toTime"],
    }
  );

export type ShowtimeSlotFormInput = z.infer<typeof showtimeSlotFormSchema>;

