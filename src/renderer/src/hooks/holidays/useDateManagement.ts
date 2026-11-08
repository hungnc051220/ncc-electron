import { holidaysApi } from "@renderer/api/holidays.api";
import { planScreeningsApi } from "@renderer/api/planScreenings.api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { holidaysKeys } from "./keys";

/** Mọi ngày của năm trong DateInYear (Quản lý ngày phân tab ở FE). */
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

export const usePopulateYear = () => {
  const invalidate = useInvalidateHolidays();
  return useMutation({
    mutationFn: (year: number) => holidaysApi.populateYear(year),
    onSuccess: invalidate
  });
};
