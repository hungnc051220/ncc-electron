import { z } from "zod";

export const manufacturerFormSchema = z.object({
  name: z.string().min(1, {
    error: "Tên hãng phim là bắt buộc",
  }),
  fullName: z.string().min(1, {
    error: "Tên công ty là bắt buộc",
  }),
  manufacturerTemplateId: z.number().optional(),
  bankName: z.string().optional(),
  phoneNumber: z.string().optional(),
  acountBank: z.string().optional(),
  addressBank: z.string().optional(),
  address: z.string().optional(),
  fax: z.string().optional(),
  url: z.string().optional(),
});

export type ManufacturerFormInput = z.infer<typeof manufacturerFormSchema>;
