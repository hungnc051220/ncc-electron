import { ReportRevenueByFilmDto, reportsApi } from "@renderer/api/reportsApi";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { reportsKeys } from "./keys";

export const useReportRevenueDayInMonth = (dto: ReportRevenueByFilmDto) =>
  useQuery({
    queryKey: reportsKeys.getReportRevenueDayInMonth(dto),
    queryFn: () => reportsApi.getReportRevenueDayInMonth(dto),
    placeholderData: keepPreviousData
  });
