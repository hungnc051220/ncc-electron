import { ReportQuarterlyDto, reportsApi } from "@renderer/api/reportsApi";
import { useQuery } from "@tanstack/react-query";
import { reportsKeys } from "./keys";

export const useReportQuarterly = (dto: ReportQuarterlyDto, enabled = true) =>
  useQuery({
    queryKey: reportsKeys.getReportQuarterly(dto),
    queryFn: () => reportsApi.getReportQuarterly(dto),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    enabled
  });
