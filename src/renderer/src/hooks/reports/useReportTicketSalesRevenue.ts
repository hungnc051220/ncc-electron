import { ReportRevenueByFilmDto, reportsApi } from "@renderer/api/reportsApi";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { reportsKeys } from "./keys";

export const useReportTicketSalesRevenue = (dto: ReportRevenueByFilmDto) =>
  useQuery({
    queryKey: reportsKeys.getReportTicketSalesRevenue(dto),
    queryFn: () => reportsApi.getReportTicketSalesRevenue(dto),
    placeholderData: keepPreviousData
  });
