import { PaymentMethodRevenueReportDto, reportsApi } from "@renderer/api/reportsApi";
import { useQuery } from "@tanstack/react-query";
import { reportsKeys } from "./keys";

export const usePaymentMethodRevenueReport = (dto: PaymentMethodRevenueReportDto) =>
  useQuery({
    queryKey: reportsKeys.getPaymentMethodRevenueReport(dto),
    queryFn: () => reportsApi.getPaymentMethodRevenueReport(dto),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false
  });
