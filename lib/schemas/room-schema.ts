import { z } from "zod";

export const roomFormSchema = z.object({
  name: z.string().min(1, {
    error: "Tên phòng chiếu là bắt buộc",
  }),
  numberOfFloor: z.number().min(1, {
    error: "Số tầng phòng chiếu phải lớn hơn 0",
  }),
  ruleOrder: z.string().min(1, { error: "Quy luật xếp ghế là bắt buộc" }),
  wideSizeF1: z.number().min(0, { error: "Chieurong phải lớn hơn 0" }).optional(),
  deepSizeF1: z.number().min(0, { error: "Chieurong phải lớn hơn 0" }).optional(),
  wideSizeF2: z.number().min(0, { error: "Chieurong phải lớn hơn 0" }).optional(),
  deepSizeF2: z.number().min(0, { error: "Chieurong phải lớn hơn 0" }).optional(),
  wideSizeF3: z.number().min(0, { error: "Chieurong phải lớn hơn 0" }).optional(),
  deepSizeF3: z.number().min(0, { error: "Chieurong phải lớn hơn 0" }).optional(),
});

export type RoomFormInput = z.infer<typeof roomFormSchema>;
