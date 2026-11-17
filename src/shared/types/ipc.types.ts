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

/** Bước cập nhật đang chạy khi lỗi xảy ra. */
export type UpdateErrorStage = "check" | "download" | "install";

/** Mã lỗi cập nhật đã chuẩn hóa; chi tiết kỹ thuật chỉ nằm trong log của main process. */
export type UpdateErrorCode =
  | "UPDATE_NETWORK"
  | "UPDATE_METADATA_UNAVAILABLE"
  | "UPDATE_DOWNLOAD_FAILED"
  | "UPDATE_INSTALL_FAILED"
  | "UPDATE_MANUAL_INSTALL_REQUIRED"
  | "UPDATE_UNKNOWN";

/** Payload `update:error` gửi sang renderer: không chứa message, stack hay URL gốc. */
export interface UpdateErrorPayload {
  code: UpdateErrorCode;
  stage: UpdateErrorStage;
  retryable: boolean;
}

export type UpdateCheckResult =
  | { status: "checked"; info: UpdateInfo | null }
  | { status: "disabled" }
  | { status: "failed"; error: UpdateErrorPayload };

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
