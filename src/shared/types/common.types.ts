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
}

export interface BackgroundProps {
  id: string;
  name: string;
  urlImage: string;
}

export type AppTheme = "light" | "dark";
