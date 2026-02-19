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
}

export type PrintTicketsArgs = {
  tickets: PrintTicketPayload[];
  printerName?: string;
};

export interface UpdateInfo {
  version: string;
}

export interface UpdaterContextType {
  version: string;
  progress: number;
  manualCheck: () => Promise<void>;
}

export interface CurrentSeatState {
  selectedSeats: ListSeat[];
  cancelMode: boolean;
}
