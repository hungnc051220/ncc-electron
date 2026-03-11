import { VoucherDto } from "@renderer/api/vouchers.api";

export const voucherKeys = {
  all: ["vouchers"] as const,
  getAll: (dto: VoucherDto) => ["vouchers", dto] as const,
  availableForPos: (dto: unknown) => ["vouchers", "availableForPos", dto] as const
};
