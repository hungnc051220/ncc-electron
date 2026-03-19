import { ReportRevenueSharingDto, reportsApi } from "@renderer/api/reportsApi";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { reportsKeys } from "./keys";

export const useReportRevenueSharing = (dto?: ReportRevenueSharingDto) =>
  useQuery({
    queryKey: reportsKeys.getReportRevenueSharing(dto),
    queryFn: () => reportsApi.getReportRevenueSharing(dto),
    placeholderData: keepPreviousData
  });
