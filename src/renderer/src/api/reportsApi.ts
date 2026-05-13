import { api } from "@renderer/api/client";
import {
  DiscountOfflineUsageReportResponse,
  ExamineTicketByPlanProps,
  MonthlyReportPlanProps,
  MonthlyReportRoomProps,
  MonthlyReportTicketProps,
  PaymentMethodRevenueReportResponse,
  ReportMonthlyRevenueTicketByStaffProps,
  ReportRevenueFilmByStaffProps,
  ReportRevenueFilmProps,
  ReportRevenueSharingDetailResponse,
  ReportRevenueSharingProps,
  ReportRevenueStaffProps,
  ReportU22UsageProps,
  ReportVoucherUsageProps,
  YearlyReportDetailResponse,
  YearlyReportSummaryItem,
  YearlyReportType
} from "@shared/types";
export interface ReportRevenueByFilmDto {
  fromDate?: string;
  toDate?: string;
  userId?: number;
  manufacturerId?: number;
  filmId?: number;
  dayType?: number; //1: theo lịch chiếu, 2: theo ngày bán
  dateType?: number; //1: theo lịch chiếu, 2: theo ngày bán
  reportType?: string;
}

export interface ReportQuarterlyDto {
  year: number;
  quarter: number;
  reportType: string;
}

export interface ReportYearlyDto {
  year: number;
  reportType: YearlyReportType;
}

export interface ReportRevenueSharingDto {
  fromDate?: string;
  toDate?: string;
  manufacturerIds?: number[];
  filmIds?: number[];
}

export interface ReportRevenueSharingDetailDto {
  filmId: number;
  manufacturerId: number;
  fromDate?: string;
  toDate?: string;
}

export interface PaymentMethodRevenueReportDto {
  storeId: number;
  fromDate: string;
  toDate: string;
}

export interface DiscountOfflineUsageReportDto {
  storeId: number;
  fromDate: string;
  toDate: string;
  discountName?: string;
}

export const reportsApi = {
  getReportRevenueByFilm: async (
    dto: ReportRevenueByFilmDto
  ): Promise<ReportRevenueFilmByStaffProps> => {
    const res = await api.post("/api/reports/revenue-by-film", dto);
    return res.data;
  },
  getReportRevenueDayInMonth: async (
    dto: ReportRevenueByFilmDto
  ): Promise<ReportMonthlyRevenueTicketByStaffProps> => {
    const res = await api.post("/api/reports/revenue-day-in-month", dto);
    return res.data;
  },
  getReportExamineTicketByPlan: async (
    dto: ReportRevenueByFilmDto
  ): Promise<ExamineTicketByPlanProps> => {
    const res = await api.post("/api/reports/examine-ticket-by-plan", dto);
    return res.data;
  },
  getReportU22Usage: async (dto: ReportRevenueByFilmDto): Promise<ReportU22UsageProps> => {
    const res = await api.post("/api/reports/u22-usage", dto);
    return res.data;
  },
  getReportVoucherUsage: async (dto: ReportRevenueByFilmDto): Promise<ReportVoucherUsageProps> => {
    const res = await api.post("/api/reports/voucher-usage", dto);
    return res.data;
  },
  getReportMonthly: async (
    dto: ReportRevenueByFilmDto
  ): Promise<MonthlyReportPlanProps | MonthlyReportTicketProps | MonthlyReportRoomProps> => {
    const res = await api.post("/api/reports/monthly-report", dto);
    return res.data;
  },
  getReportQuarterly: async (
    dto: ReportQuarterlyDto
  ): Promise<MonthlyReportPlanProps | MonthlyReportTicketProps | MonthlyReportRoomProps> => {
    const res = await api.post("/api/reports/quarterly-report", dto);
    return res.data;
  },
  getReportYearly: async (
    dto: ReportYearlyDto
  ): Promise<
    YearlyReportDetailResponse | YearlyReportSummaryItem[] | { data: YearlyReportSummaryItem[] }
  > => {
    const res = await api.post("/api/reports/yearly-report", dto);
    return res.data;
  },
  getReportTicketSalesRevenue: async (
    dto: ReportRevenueByFilmDto
  ): Promise<ReportRevenueFilmProps | ReportRevenueStaffProps> => {
    const res = await api.post("/api/reports/revenue", dto);
    return res.data;
  },
  getReportRevenueSharing: async (
    dto?: ReportRevenueSharingDto
  ): Promise<ReportRevenueSharingProps[]> => {
    const res = await api.post("/api/reports/revenue-sharing", dto);
    return res.data;
  },
  getReportRevenueSharingDetails: async (
    dto: ReportRevenueSharingDetailDto
  ): Promise<ReportRevenueSharingDetailResponse> => {
    const res = await api.post("/api/reports/revenue-sharing-details", dto);
    return res.data;
  },
  getPaymentMethodRevenueReport: async (
    dto: PaymentMethodRevenueReportDto
  ): Promise<PaymentMethodRevenueReportResponse> => {
    const res = await api.post("/api/reports/payment-method-revenue", dto);
    return res.data;
  },
  getDiscountOfflineUsageReport: async (
    dto: DiscountOfflineUsageReportDto
  ): Promise<DiscountOfflineUsageReportResponse> => {
    const res = await api.post("/api/reports/discount-offline-usage", dto);
    return res.data;
  }
};
