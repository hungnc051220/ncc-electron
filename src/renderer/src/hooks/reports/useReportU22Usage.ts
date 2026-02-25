import { ReportRevenueByFilmDto, reportsApi } from "@renderer/api/reportsApi";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { reportsKeys } from "./keys";

export const useReportU22Usage = (dto: ReportRevenueByFilmDto) =>
  useQuery({
    queryKey: reportsKeys.getReportU22Usage(dto),
    queryFn: () => reportsApi.getReportU22Usage(dto),
    placeholderData: keepPreviousData
  });
