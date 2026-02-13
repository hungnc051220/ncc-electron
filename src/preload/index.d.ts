import { ElectronAPI } from "@electron-toolkit/preload";

declare global {
  interface Window {
    electron: ElectronAPI;
    api: {
      openCustomerScreen(id: number): void;
      closeCustomerScreen(): void;
      sendSeatUpdate(data: unknown): void;
      onSeatUpdate(cb: (data: unknown) => void): () => void;
      sendQrDialogOpen(data: unknown): void;
      sendQrDialogClose(): void;
      onQrDialogOpen(cb: (data: unknown) => void): () => void;
      onQrDialogClose(cb: () => void): () => void;
      printTicket(orderId: number, itemIndex: number, seatIndex: number): void;
      printTickets(orderId: number, ticketsData: unknown): void;
      getDefaultExportFolder(): Promise<string>;
      selectFolder(): Promise<string>;
      exportTicket(payload: unknown): Promise<void>;
      readFile(path: string): Promise<Uint8Array>;
      getVersion(): Promise<string>;
      checkUpdate(): Promise<UpdateInfo | null>;
      startDownload(): Promise<void>;
      install(): Promise<void>;
      onAvailable(cb: (info: UpdateInfo) => void): void;
      onProgress(cb: (percent: number) => void): void;
      onReady(cb: () => void): void;
      onError(cb: (msg: string) => void): void;
    };
  }
}
