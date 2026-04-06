import { ReportRevenueByFilmDto, reportsApi } from "@renderer/api/reportsApi";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { reportsKeys } from "./keys";

export const useReportVoucherUsage = (dto: ReportRevenueByFilmDto, enabled = true) =>
  useQuery({
    queryKey: reportsKeys.getReportVoucherUsage(dto),
    queryFn: () => reportsApi.getReportVoucherUsage(dto),
    placeholderData: keepPreviousData,
    enabled
  });
