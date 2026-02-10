import { api } from "@renderer/api/client";
import { ReportRevenueFilmByStaffProps } from "@renderer/types";

export interface ReportRevenueByFilmDto {
  fromDate?: string;
  toDate?: string;
  userId?: number;
  manufacturerId?: number;
  filmId?: number;
}

export const reportsApi = {
  getReportRevenueByFilm: async (
    dto: ReportRevenueByFilmDto
  ): Promise<ReportRevenueFilmByStaffProps> => {
    const res = await api.post("/api/reports/revenue-by-film", dto);
    return res.data;
  }
};
