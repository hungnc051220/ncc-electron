import { pricingRulesApi } from "@renderer/api/pricingRules.api";
import { getApiErrorStatus } from "@renderer/lib/apiError";
import { useQuery } from "@tanstack/react-query";
import { ticketPricesKeys } from "./keys";

/**
 * Quy tắc giá và khả năng của backend (`GET /api/pos/pricing/rules`). `data === null`: backend cũ (404);
 * `data === undefined` (đang tải hoặc lỗi khác): coi như chưa hỗ trợ, FE ẩn các chức năng mới.
 */
export const usePricingRules = () =>
  useQuery({
    queryKey: ticketPricesKeys.rules,
    queryFn: pricingRulesApi.get,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => getApiErrorStatus(error) !== 404 && failureCount < 2
  });
