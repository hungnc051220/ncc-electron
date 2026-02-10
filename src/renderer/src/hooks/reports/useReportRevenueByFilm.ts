import { ReportRevenueByFilmDto, reportsApi } from "@renderer/api/reportsApi";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { reportsKeys } from "./keys";

export const useReportRevenueByFilm = (dto: ReportRevenueByFilmDto) =>
  useQuery({
    queryKey: reportsKeys.getReportRevenueByFilm(),
    queryFn: () => reportsApi.getReportRevenueByFilm(dto),
    placeholderData: keepPreviousData
  });
