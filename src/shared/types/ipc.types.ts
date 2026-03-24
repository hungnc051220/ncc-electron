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
  posName?: string;
  staffName?: string;
}

export type PrintTicketsArgs = {
  tickets: PrintTicketPayload[];
  printerName?: string;
};

export interface UpdateInfo {
  version: string;
}

export interface UpdateDownloadProgress {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

export interface UpdaterContextType {
  version: string;
  progress: number;
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
