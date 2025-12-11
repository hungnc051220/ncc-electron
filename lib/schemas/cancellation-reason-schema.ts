import { z } from "zod";

export const cancellationReasonFormSchema = z.object({
  reason: z.string().min(1, {
    error: "Lý do hủy là bắt buộc",
  }),
});

export type CancellationReasonFormInput = z.infer<typeof cancellationReasonFormSchema>;
