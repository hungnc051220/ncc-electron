import {
  YearlyReportDetailResponse,
  YearlyReportFilmDetail,
  YearlyReportManufacturerDetail,
  YearlyReportQuarterDetail,
  YearlyReportSummaryItem
} from "@shared/types";

export const QUARTERS = [1, 2, 3, 4] as const;

export const getQuarterDetail = (
  quarters: YearlyReportFilmDetail["quarters"],
  quarter: (typeof QUARTERS)[number]
): YearlyReportQuarterDetail => quarters?.[quarter] || {};

export const normalizeYearlyDetailData = (response: unknown): YearlyReportManufacturerDetail[] => {
  if (
    response &&
    typeof response === "object" &&
    "data" in response &&
    Array.isArray((response as YearlyReportDetailResponse).data)
  ) {
    return (response as YearlyReportDetailResponse).data;
  }

  return [];
};

export const normalizeYearlySummaryData = (response: unknown): YearlyReportSummaryItem[] => {
  if (Array.isArray(response)) {
    return response as YearlyReportSummaryItem[];
  }

  if (
    response &&
    typeof response === "object" &&
    "data" in response &&
    Array.isArray((response as { data: YearlyReportSummaryItem[] }).data)
  ) {
    return (response as { data: YearlyReportSummaryItem[] }).data;
  }

  return [];
};
