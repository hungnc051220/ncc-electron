import { holidaysApi, HolidaysQuery } from "@renderer/api/holidays.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { holidaysKeys } from "./keys";

export const useHolidays = (params: HolidaysQuery) =>
  useQuery({
    queryKey: holidaysKeys.getAll(params),
    queryFn: () => holidaysApi.getAll(params),
    placeholderData: keepPreviousData
  });
