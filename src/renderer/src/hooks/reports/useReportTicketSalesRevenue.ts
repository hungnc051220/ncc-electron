import { ReportRevenueByFilmDto, reportsApi } from "@renderer/api/reportsApi";
import { useQuery } from "@tanstack/react-query";
import { reportsKeys } from "./keys";

export const useReportTicketSalesRevenue = (dto: ReportRevenueByFilmDto, enabled = true) =>
  useQuery({
    queryKey: reportsKeys.getReportTicketSalesRevenue(dto),
    queryFn: () => reportsApi.getReportTicketSalesRevenue(dto),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    enabled
  });
