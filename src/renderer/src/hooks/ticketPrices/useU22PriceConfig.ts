import { u22PriceConfigApi } from "@renderer/api/u22PriceConfig.api";
import { useQuery } from "@tanstack/react-query";
import { ticketPricesKeys } from "./keys";

/** Cấu hình giá U22 hiện hành. Không retry: 503 `U22_PRICE_CONFIG_UNAVAILABLE` cần hiện ngay. */
export const useU22PriceConfig = (enabled = true) =>
  useQuery({
    queryKey: ticketPricesKeys.u22Config,
    queryFn: () => u22PriceConfigApi.get(),
    enabled,
    retry: false
  });
