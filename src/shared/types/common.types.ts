import { QrDialogData } from "./order.types";

export interface MachineSerialProps {
  shortName: string;
  activeYear: number;
  posName: string;
  printTimes: number;
  cancelTimes: number;
  updatedOnUtc: string;
}

export interface CancellationReasonProps {
  id: number;
  reason: string;
  deleted: boolean;
  createdOnUtc: string;
  createdUser: string;
  updatedOnUtc: string;
  updatedUser: string;
}

export interface HolidayProps {
  dateValue: string;
  dateTypeId: number;
  createdOnUtc: string;
  createdUser: string;
  CreatedOnUtc: string;
  /** Ngày lễ: không áp dụng U22. Backend cũ (chưa có cột) không trả trường này. */
  isHoliday?: boolean;
  holidayName?: string | null;
}

export interface BackgroundProps {
  id: string;
  name: string;
  urlImage: string;
}

export type AppTheme = "light" | "dark";

export interface QrState {
  isOpen: boolean;
  data?: QrDialogData;
}
