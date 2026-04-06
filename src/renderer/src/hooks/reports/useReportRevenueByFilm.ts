import { ReportRevenueByFilmDto, reportsApi } from "@renderer/api/reportsApi";
import { useQuery } from "@tanstack/react-query";
import { reportsKeys } from "./keys";

export const useReportRevenueByFilm = (dto: ReportRevenueByFilmDto, enabled = true) =>
  useQuery({
    queryKey: reportsKeys.getReportRevenueByFilm(dto),
    queryFn: () => reportsApi.getReportRevenueByFilm(dto),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    enabled
  });
