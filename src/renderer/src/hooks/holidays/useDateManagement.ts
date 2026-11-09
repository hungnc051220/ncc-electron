import { holidaysApi, type InitializeYearBody } from "@renderer/api/holidays.api";
import { planScreeningsApi } from "@renderer/api/planScreenings.api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { holidaysKeys } from "./keys";

/** Mọi ngày của năm trong DateInYear (Danh sách ngày phân tab ở FE). */
export const useDateInYear = (year: number) =>
  useQuery({
    queryKey: holidaysKeys.year(year),
    queryFn: () => holidaysApi.getYear(year)
  });

/** Các ngày trong năm đã có suất chiếu (`available-dates`), để cảnh báo ảnh hưởng tới U22. */
export const useScreeningDates = (year: number, enabled = true) =>
  useQuery({
    queryKey: holidaysKeys.screeningDates(year),
    // Backend nhận và trả ngày dạng DD-MM-YYYY; quy về YYYY-MM-DD như DateInYear.
    queryFn: async () => {
      const dates = await planScreeningsApi.getAvailableDates(`01-01-${year}`, `31-12-${year}`);
      return new Set(dates.map((date) => date.split("-").reverse().join("-")));
    },
    enabled
  });

const useInvalidateHolidays = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: holidaysKeys.all });
};

export const useMarkHoliday = () => {
  const invalidate = useInvalidateHolidays();
  return useMutation({
    mutationFn: ({ dateValue, holidayName }: { dateValue: string; holidayName: string }) =>
      holidaysApi.markHoliday(dateValue, holidayName),
    onSuccess: invalidate
  });
};

export const useUnmarkHoliday = () => {
  const invalidate = useInvalidateHolidays();
  return useMutation({
    mutationFn: (dateValue: string) => holidaysApi.unmarkHoliday(dateValue),
    onSuccess: invalidate
  });
};

/**
 * Lưu "Thiết lập ngày": đổi phân loại nền (`DateTypeId`) của đúng các ngày được chọn qua `bulk-create` hiện
 * có (`specialDates` MM-DD, không dùng `daysInWeek` để không ghi đè ngày đặc biệt), rồi đánh dấu các ngày lễ
 * mặc định Admin đã chọn qua `PUT :dateValue/holiday` hiện có. Ngày đã là ngày lễ không bị đụng tới.
 */
export const useReclassifyDays = () => {
  const invalidate = useInvalidateHolidays();
  return useMutation({
    mutationFn: async ({
      year,
      toNormal,
      toWeekend,
      holidaysToMark = []
    }: {
      year: number;
      toNormal: string[];
      toWeekend: string[];
      holidaysToMark?: { dateValue: string; holidayName: string }[];
    }) => {
      const batches = [
        { dateTypeId: 1, specialDates: toNormal },
        { dateTypeId: 2, specialDates: toWeekend }
      ].filter((batch) => batch.specialDates.length > 0);
      for (const batch of batches) {
        await holidaysApi.create({ year, daysInWeek: [], specificDate: null, ...batch });
      }
      for (const holiday of holidaysToMark) {
        await holidaysApi.markHoliday(holiday.dateValue, holiday.holidayName);
      }
    },
    // Lỗi giữa chừng: vẫn tải lại để bảng hiện đúng phần đã lưu.
    onSettled: invalidate
  });
};

/** "Khởi tạo năm": các ngày còn thiếu + phân loại theo thứ + ngày lễ đã chọn, trong một lệnh (transaction). */
export const useInitializeYear = () => {
  const invalidate = useInvalidateHolidays();
  return useMutation({
    mutationFn: ({ year, ...body }: { year: number } & InitializeYearBody) =>
      holidaysApi.initializeYear(year, body),
    onSettled: invalidate
  });
};
