import { ReportRevenueByFilmDto, reportsApi } from "@renderer/api/reportsApi";
import { useQuery } from "@tanstack/react-query";
import { reportsKeys } from "./keys";

export const useReportMonthly = (dto: ReportRevenueByFilmDto, enabled = true) =>
  useQuery({
    queryKey: reportsKeys.getReportMonthly(dto),
    queryFn: () => reportsApi.getReportMonthly(dto),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    enabled
  });
