import { ReportYearlyDto, reportsApi } from "@renderer/api/reportsApi";
import { useQuery } from "@tanstack/react-query";
import { reportsKeys } from "./keys";

export const useReportYearly = (dto: ReportYearlyDto, enabled = true) =>
  useQuery({
    queryKey: reportsKeys.getReportYearly(dto),
    queryFn: () => reportsApi.getReportYearly(dto),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    enabled
  });
