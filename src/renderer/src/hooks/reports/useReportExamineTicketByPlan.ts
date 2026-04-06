import { ReportRevenueByFilmDto, reportsApi } from "@renderer/api/reportsApi";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { reportsKeys } from "./keys";

export const useReportExamineTicketByPlan = (dto: ReportRevenueByFilmDto, enabled = true) =>
  useQuery({
    queryKey: reportsKeys.getReportExamineTicketByPlan(dto),
    queryFn: () => reportsApi.getReportExamineTicketByPlan(dto),
    placeholderData: keepPreviousData,
    enabled
  });
