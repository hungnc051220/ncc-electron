import { ConfigExchangePointsDto, vouchersApi } from "@renderer/api/vouchers.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { voucherKeys } from "./keys";

export const useConfigExchangePoints = (dto: ConfigExchangePointsDto) =>
  useQuery({
    queryKey: voucherKeys.getConfigExchangePoints(dto),
    queryFn: () => vouchersApi.getConfigExchangePoints(dto),
    placeholderData: keepPreviousData
  });
