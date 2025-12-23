import { z } from "zod";

export const planCinemaFormSchema = z.object({
  name: z.string().min(1, { error: "Tên kế hoạch là bắt buộc" }).trim(),
  desciption: z.string().optional(),
});

export type PlanCinemaFormInput = z.infer<typeof planCinemaFormSchema>;
