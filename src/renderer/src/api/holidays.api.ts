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
  /** `dayjs().day()` (0 = Chủ nhật … 6 = Thứ 7): đổi mọi ngày của các thứ này trong năm. */
  daysInWeek: number[];
  /** `MM-DD`: đổi đúng các ngày này. */
  specialDates: string[];
  specificDate: string | null;
}

/** Body của "Khởi tạo năm" (`POST /api/pos/date-in-year/initialize/:year`). */
export interface InitializeYearBody {
  /** `dayjs().day()` (0 = Chủ nhật … 6 = Thứ 7) được xếp Cuối tuần; các thứ khác là Ngày thường. */
  weekendDays: number[];
  /**
   * Ngày lễ đánh dấu trên các ngày được tạo. `applyHolidayPrice` (V3.2): chỉ gửi khi backend có cột
   * `ApplyHolidayPrice` (`rules.schema.holidayPriceMode`); backend cũ không nhận trường này.
   */
  holidays: { dateValue: string; holidayName: string; applyHolidayPrice?: boolean }[];
}

export interface InitializeYearResult {
  year: number;
  createdDays: number;
  weekendDayCount: number;
  holidayCount: number;
}

/** Body `PUT /api/pos/date-in-year/:dateValue/holiday` (contract V3.2 mục 5.2). */
export interface MarkHolidayBody {
  holidayName: string;
  /** Chỉ gửi khi backend có cột `ApplyHolidayPrice`; thiếu → backend giữ giá trị đang lưu. */
  applyHolidayPrice?: boolean;
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
  },
  /** Mọi ngày của một năm (tối đa 366 dòng); Danh sách ngày phân tab ở FE. */
  getYear: async (year: number): Promise<HolidayProps[]> => {
    const filter = { dateValue: { between: [`${year}-01-01`, `${year}-12-31`] } };
    const query = queryString.stringify({
      current: 1,
      pageSize: 400,
      filter: JSON.stringify(filter)
    });
    const res = await api.get<ApiResponse<HolidayProps>>(`/api/pos/date-in-year?${query}`);
    return res.data.data ?? [];
  },
  /**
   * Đánh dấu / sửa ngày lễ (tên và chế độ giá); ngày phải có sẵn trong DateInYear (404 nếu chưa có). Không đổi
   * `DateTypeId` hay cờ không áp ưu đãi. Response V3.2 có `existingScreenings`.
   */
  markHoliday: async (dateValue: string, body: MarkHolidayBody): Promise<HolidayProps> => {
    const res = await api.put(`/api/pos/date-in-year/${dateValue}/holiday`, {
      holidayName: body.holidayName,
      ...(body.applyHolidayPrice === undefined ? {} : { applyHolidayPrice: body.applyHolidayPrice })
    });
    return res.data;
  },
  /** Bỏ đánh dấu ngày lễ, giữ nguyên dòng ngày, loại giá và cờ không áp ưu đãi. */
  unmarkHoliday: async (dateValue: string): Promise<HolidayProps> => {
    const res = await api.delete(`/api/pos/date-in-year/${dateValue}/holiday`);
    return res.data;
  },
  /** Bật/tắt "Không áp ưu đãi". Không đổi phân loại gốc hay cờ ngày lễ. */
  setPromotionExclusion: async (dateValue: string, excluded: boolean): Promise<HolidayProps> => {
    const res = await api.put(`/api/pos/date-in-year/${dateValue}/promotion-exclusion`, {
      excluded
    });
    return res.data;
  },
  /**
   * Khởi tạo năm trong một transaction ở backend: tạo các ngày còn thiếu, phân loại theo thứ và đánh dấu
   * ngày lễ đã chọn. Ngày đã có không bị đổi.
   */
  initializeYear: async (year: number, body: InitializeYearBody): Promise<InitializeYearResult> => {
    const res = await api.post(`/api/pos/date-in-year/initialize/${year}`, body);
    return res.data;
  }
};
