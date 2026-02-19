import { api } from "@renderer/api/client";
import { ApiResponse, HolidayProps } from "@shared/types";
import dayjs from "dayjs";
import queryString from "query-string";

export interface HolidaysQuery {
  current: number;
  pageSize: number;
  dateTypeId: number;
  year: number;
}

export interface HolidayDto {
  year: number;
  dateTypeId: number;
  daysInWeek: string[];
  specialDates: string[];
  specificDate: string | null;
}

export const holidaysApi = {
  getAll: async (params: HolidaysQuery): Promise<ApiResponse<HolidayProps>> => {
    const { current, pageSize, dateTypeId, year } = params;

    const startOfYear = dayjs().year(year).startOf("year").format("YYYY-MM-DD");
    const endOfYear = dayjs().year(year).endOf("year").format("YYYY-MM-DD");

    const filter: Record<string, unknown> = {
      dateTypeId,
      dateValue: { between: [startOfYear, endOfYear] }
    };

    const queryObject: Record<string, unknown> = {
      current,
      pageSize
    };

    if (Object.keys(filter).length > 0) {
      queryObject.filter = JSON.stringify(filter);
    }

    const query = queryString.stringify(queryObject, {
      skipEmptyString: true,
      skipNull: true
    });

    const res = await api.get(`/api/pos/date-in-year?${query}`);

    return res.data;
  },
  create: async (dto: HolidayDto) => {
    const res = await api.post("/api/pos/date-in-year/bulk-create", dto);
    return res.data;
  },
  delete: async (dateValue: string) => {
    const res = await api.delete(`/api/pos/date-in-year/${dateValue}`);
    return res.data;
  }
};
