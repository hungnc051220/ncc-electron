import { AvailableForPosDto, vouchersApi } from "@renderer/api/vouchers.api";
import { useQuery } from "@tanstack/react-query";
import { voucherKeys } from "./keys";

export const useAvailableVouchersForPos = (dto: AvailableForPosDto, enabled = true) =>
  useQuery({
    queryKey: voucherKeys.availableForPos(dto),
    queryFn: () => vouchersApi.getAvailableForPos(dto),
    enabled,
    gcTime: 0,
    refetchOnMount: "always"
  });
