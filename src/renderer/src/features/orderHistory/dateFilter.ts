import dayjs from "dayjs";

export const getCurrentDayDateRange = (): [string, string] => [
  dayjs().startOf("day").format(),
  dayjs().endOf("day").format()
];

export const isCurrentDayDateRange = (dateRange?: [string, string]) =>
  Boolean(
    dateRange?.length === 2 &&
    dayjs(dateRange[0]).isSame(dayjs(), "day") &&
    dayjs(dateRange[1]).isSame(dayjs(), "day")
  );
