import {
  AppConfig,
  AppTheme,
  CurrentSeatState,
  OrderResponseProps,
  PlanScreeningDetailProps,
  PrintTicketPayload,
  QrState,
  SeatTypeProps,
  UpdatePolicy,
  UpdateReadyInfo,
  UpdateDownloadProgress,
  UpdateInfo
} from "@shared/types";

export interface CustomerScreenPayload {
  data: PlanScreeningDetailProps | null;
  seatTypes: SeatTypeProps[];
  orders: OrderResponseProps[];
}

export interface SaveFileFilter {
  name: string;
  extensions: string[];
}

export interface SaveFileParams {
  defaultFileName: string;
  content: Uint8Array;
  filters?: SaveFileFilter[];
  openAfterSave?: boolean;
}

export interface SaveFileResult {
  canceled: boolean;
  filePath?: string;
}

export interface PreloadAPI {
  getConfig: () => Promise<AppConfig>;
  setConfig: (config: AppConfig) => Promise<void>;
  openCustomerScreen(id: number): Promise<void>;
  openCustomerRoute(route: string): Promise<void>;
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
  getUpdatePolicy(): Promise<UpdatePolicy>;
  checkUpdate(): Promise<UpdateInfo | null>;
  startDownload(): Promise<void>;
  pauseMockUpdateDownload(): Promise<void>;
  resumeMockUpdateDownload(): Promise<void>;
  install(options?: { isSilent?: boolean }): Promise<void>;
  onAvailable(cb: (info: UpdateInfo) => void): () => void;
  onUpdatePolicy(cb: (policy: UpdatePolicy) => void): () => void;
  onProgress(cb: (progress: UpdateDownloadProgress) => void): () => void;
  onReady(cb: (info?: UpdateReadyInfo) => void): () => void;
  onError(cb: (msg: string) => void): () => void;
  getPrinters: () => Promise<Electron.PrinterInfo[]>;
  sendThemeUpdate: (theme: AppTheme) => void;
  requestTheme: () => void;
  onThemeUpdate: (cb: (theme: AppTheme) => void) => () => void;
  quitApp: () => void;
}
