import { ListSeat, QrCodeResponseProps } from ".";

export {};

interface QrDialogData {
  dataQr: QrCodeResponseProps;
  filmName: string;
  roomName: string;
  projectDate: string;
  projectTime: string;
  selectedSeats: string;
  orderTotal?: number;
  orderDiscount?: number;
  orderCreatedAt?: string;
}

declare global {
  interface Window {
    electron?: {
      openCustomerScreen: (planScreeningsId: number) => void;
      closeCustomerScreen: () => void;
      sendSeatUpdate: (data: ListSeat[]) => void;
      onSeatUpdate: (callback: (data: ListSeat[]) => void) => void;
      sendQrDialogOpen: (data: QrDialogData) => void;
      sendQrDialogClose: () => void;
      onQrDialogOpen: (callback: (data: QrDialogData) => void) => void;
      onQrDialogClose: (callback: () => void) => void;
      printTicket: (
        orderId?: number,
        itemIndex?: number,
        seatIndex?: number
      ) => void;
      printTickets: (
        orderId: number,
        ticketsData?: Array<{ itemIndex: number; seatIndex: number }>
      ) => void;
    };
  }
}
