import { z } from "zod";

export const contractTicketSaleFormSchema = z.object({
  customerFirstName: z.string().min(1, {
    message: "Tên khách hàng là bắt buộc",
  }),
  customerPhone: z.string().min(1, {
    message: "Số điện thoại là bắt buộc",
  }),
  orderTotal: z
    .any()
    .refine((val) => val !== undefined && Number(val) >= 0, {
      message: "Giá trị hợp đồng không hợp lệ",
    })
    .transform((val) => Number(val)),
  createdBy: z.string().optional(),
  cinemaName: z.string().optional(),
  cinemaAddress: z.string().optional(),
  cinemaPhone: z.string().optional(),
  cinemaFax: z.string().optional(),
  cinemaWebsite: z.string().optional(),
});

export type ContractTicketSaleFormInput = z.infer<
  typeof contractTicketSaleFormSchema
>;
