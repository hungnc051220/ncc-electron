import {
  AppTheme,
  CurrentSeatState,
  PlanScreeningDetailProps,
  PrintTicketPayload,
  QrState,
  UpdateInfo
} from "@shared/types";

export interface PreloadAPI {
  openCustomerScreen(id: number): Promise<void>;
  closeCustomerScreen(): Promise<void>;
  requestCustomerInit(): void;
  sendCustomerData(data: PlanScreeningDetailProps): void;
  onCustomerData(cb: (data: PlanScreeningDetailProps) => void): () => void;
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
  getVersion(): Promise<string>;
  checkUpdate(): Promise<UpdateInfo | null>;
  startDownload(): Promise<void>;
  install(): Promise<void>;
  onAvailable(cb: (info: UpdateInfo) => void): void;
  onProgress(cb: (percent: number) => void): void;
  onReady(cb: () => void): void;
  onError(cb: (msg: string) => void): void;
  getPrinters: () => Promise<Electron.PrinterInfo[]>;
  sendThemeUpdate: (theme: AppTheme) => void;
  requestTheme: () => void;
  onThemeUpdate: (cb: (theme: AppTheme) => void) => () => void;
}
