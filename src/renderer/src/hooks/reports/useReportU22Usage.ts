import { ReportRevenueByFilmDto, reportsApi } from "@renderer/api/reportsApi";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { reportsKeys } from "./keys";

export const useReportU22Usage = (dto: ReportRevenueByFilmDto, enabled = true) =>
  useQuery({
    queryKey: reportsKeys.getReportU22Usage(dto),
    queryFn: () => reportsApi.getReportU22Usage(dto),
    placeholderData: keepPreviousData,
    enabled
  });
