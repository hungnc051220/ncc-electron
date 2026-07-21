import { ListSeat } from "./screening.types";

export interface PrintTicketPayload {
  cinemaName: string;
  address: string;
  movieName: string;
  showTime: string;
  date: string;
  seat: string;
  room: string;
  floor: string;
  price: string;
  ticketCode: string;
  qrData: string;
  discountImage?: string;
  posName?: string;
  staffName?: string;
  paymentMethod?: string;
}

export type PrintTicketsArgs = {
  tickets: PrintTicketPayload[];
  printerName?: string;
};

export interface ExportTicketPayload {
  filmName?: string | null;
  filmNameEn?: string | null;
  duration?: number | null;
  date: string;
  datetime: string;
  room?: string | null;
  seat: string;
  imageSource: string;
  qrImage: string;
  barCode: string;
  folder: string;
  floor?: string | null;
  categories?: string;
  countryName?: string | null;
  openAfterExport?: boolean;
}

export type UpdateMode = "optional" | "silent" | "force";

export interface UpdatePolicy {
  enabled: boolean;
  latestVersion?: string;
  minSupportedVersion?: string;
  mode: UpdateMode;
  messages?: string[];
  releaseNotesUrl?: string;
}

export interface UpdateInfo {
  version: string;
  mode?: UpdateMode;
  messages?: string[];
  policy?: UpdatePolicy;
}

export interface UpdateDownloadProgress {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

export interface UpdateReadyInfo {
  mode?: UpdateMode;
  policy?: UpdatePolicy;
}

export interface UpdaterContextType {
  version: string;
  progress: number;
  policy: UpdatePolicy | null;
  manualCheck: () => Promise<void>;
  showVersionInfo: () => Promise<void>;
}

export interface CurrentSeatState {
  selectedSeats: ListSeat[];
  cancelMode: boolean;
  selectedFloor: number | null;
}

export interface AppConfig {
  apiBaseUrl: string;
  socketUrl: string;
  theme: "light" | "dark";
}
