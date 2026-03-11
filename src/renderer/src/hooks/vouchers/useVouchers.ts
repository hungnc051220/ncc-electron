import { VoucherDto, vouchersApi } from "@renderer/api/vouchers.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { voucherKeys } from "./keys";

export const useVouchers = (dto: VoucherDto) =>
  useQuery({
    queryKey: voucherKeys.getAll(dto),
    queryFn: () => vouchersApi.getAll(dto),
    placeholderData: keepPreviousData
  });
