import { ReportRevenueByFilmDto } from "@renderer/api/reportsApi";

export const reportsKeys = {
  getReportRevenueByFilm: (dto: ReportRevenueByFilmDto) => ["report-revenue-by-film", dto] as const,
  getReportRevenueDayInMonth: (dto: ReportRevenueByFilmDto) =>
    ["report-revenue-day-in-month", dto] as const,
  getReportExamineTicketByPlan: (dto: ReportRevenueByFilmDto) =>
    ["report-examine-ticket-by-plan", dto] as const,
  getReportU22Usage: (dto: ReportRevenueByFilmDto) => ["report-u22-usage", dto] as const,
  getReportVoucherUsage: (dto: ReportRevenueByFilmDto) => ["report-voucher-usage", dto] as const
};
