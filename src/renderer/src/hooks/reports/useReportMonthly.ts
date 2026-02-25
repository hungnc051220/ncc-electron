import { ReportRevenueByFilmDto, reportsApi } from "@renderer/api/reportsApi";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { reportsKeys } from "./keys";

export const useReportMonthly = (dto: ReportRevenueByFilmDto) =>
  useQuery({
    queryKey: reportsKeys.getReportMonthly(dto),
    queryFn: () => reportsApi.getReportMonthly(dto),
    placeholderData: keepPreviousData
  });
