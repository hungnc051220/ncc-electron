import { DiscountOfflineUsageReportDto, reportsApi } from "@renderer/api/reportsApi";
import { useQuery } from "@tanstack/react-query";
import { reportsKeys } from "./keys";

export const useDiscountOfflineUsageReport = (dto: DiscountOfflineUsageReportDto) =>
  useQuery({
    queryKey: reportsKeys.getDiscountOfflineUsageReport(dto),
    queryFn: () => reportsApi.getDiscountOfflineUsageReport(dto),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false
  });
