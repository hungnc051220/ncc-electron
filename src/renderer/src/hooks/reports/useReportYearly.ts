import { ReportYearlyDto, reportsApi } from "@renderer/api/reportsApi";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { reportsKeys } from "./keys";

export const useReportYearly = (dto: ReportYearlyDto, enabled = true) =>
  useQuery({
    queryKey: reportsKeys.getReportYearly(dto),
    queryFn: () => reportsApi.getReportYearly(dto),
    placeholderData: keepPreviousData,
    enabled
  });
