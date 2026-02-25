import { ReportQuarterlyDto, reportsApi } from "@renderer/api/reportsApi";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { reportsKeys } from "./keys";

export const useReportQuarterly = (dto: ReportQuarterlyDto) =>
  useQuery({
    queryKey: reportsKeys.getReportQuarterly(dto),
    queryFn: () => reportsApi.getReportQuarterly(dto),
    placeholderData: keepPreviousData
  });
