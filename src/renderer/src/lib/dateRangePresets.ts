import type { RangePickerProps } from "antd/es/date-picker";
import dayjs from "dayjs";

export const rangePresets: RangePickerProps["presets"] = [
  { label: "Hôm nay", value: () => [dayjs().startOf("day"), dayjs().endOf("day")] },
  { label: "7 ngày trước", value: () => [dayjs().subtract(7, "day"), dayjs()] },
  { label: "14 ngày trước", value: () => [dayjs().subtract(14, "day"), dayjs()] },
  { label: "30 ngày trước", value: () => [dayjs().subtract(30, "day"), dayjs()] },
  { label: "90 ngày trước", value: () => [dayjs().subtract(90, "day"), dayjs()] }
];
