import {
  AppConfig,
  AppTheme,
  CurrentSeatState,
  PlanScreeningDetailProps,
  PrintTicketPayload,
  QrState,
  SeatTypeProps,
  UpdateDownloadProgress,
  UpdateInfo
} from "@shared/types";

export interface CustomerScreenPayload {
  data: PlanScreeningDetailProps | null;
  seatTypes: SeatTypeProps[];
}

export interface SaveFileFilter {
  name: string;
  extensions: string[];
}

export interface SaveFileParams {
  defaultFileName: string;
  content: Uint8Array;
  filters?: SaveFileFilter[];
}

export interface SaveFileResult {
  canceled: boolean;
  filePath?: string;
}

export interface PreloadAPI {
  getConfig: () => Promise<AppConfig>;
  setConfig: (config: AppConfig) => Promise<void>;
  openCustomerScreen(id: number): Promise<void>;
  closeCustomerScreen(): Promise<void>;
  requestCustomerInit(): void;
  sendCustomerData(payload: CustomerScreenPayload): void;
  onCustomerData(cb: (payload: CustomerScreenPayload) => void): () => void;
  sendSeatUpdate(data: CurrentSeatState): void;
  onSeatSync(cb: (data: CurrentSeatState) => void): () => void;

  sendQrOpen(data: unknown): void;
  sendQrClose(): void;
  onQrSync(cb: (data: QrState) => void): () => void;

  printTickets(tickets: PrintTicketPayload[], printerName?: string): Promise<void>;

  getDefaultExportFolder(): Promise<string>;
  selectFolder(): Promise<string>;

  exportTicket(payload: unknown): Promise<string>;

  readFile(path: string): Promise<Uint8Array>;
  saveFile(params: SaveFileParams): Promise<SaveFileResult>;
  getVersion(): Promise<string>;
  checkUpdate(): Promise<UpdateInfo | null>;
  startDownload(): Promise<void>;
  pauseMockUpdateDownload(): Promise<void>;
  resumeMockUpdateDownload(): Promise<void>;
  install(): Promise<void>;
  onAvailable(cb: (info: UpdateInfo) => void): () => void;
  onProgress(cb: (progress: UpdateDownloadProgress) => void): () => void;
  onReady(cb: () => void): () => void;
  onError(cb: (msg: string) => void): () => void;
  getPrinters: () => Promise<Electron.PrinterInfo[]>;
  sendThemeUpdate: (theme: AppTheme) => void;
  requestTheme: () => void;
  onThemeUpdate: (cb: (theme: AppTheme) => void) => () => void;
  quitApp: () => void;
}
