export interface UpdateInfo {
  version: string;
}

export type PrintTicketPayload = {
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
};

export interface PreloadAPI {
  openCustomerScreen(id: number): void;
  closeCustomerScreen(): void;

  sendSeatUpdate(data: unknown): void;
  onSeatUpdate(cb: (data: unknown) => void): () => void;

  sendQrDialogOpen(data: unknown): void;
  sendQrDialogClose(): void;

  onQrDialogOpen(cb: (data: unknown) => void): () => void;
  onQrDialogClose(cb: () => void): () => void;

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
}
