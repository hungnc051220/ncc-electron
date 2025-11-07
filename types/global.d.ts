import { ListSeat } from ".";

export {};

declare global {
  interface Window {
    electron?: {
      openCustomerScreen: (planScreeningsId: number) => void;
      closeCustomerScreen: () => void;
      sendSeatUpdate: (data: ListSeat[]) => void;
      onSeatUpdate: (callback: (data: ListSeat[]) => void) => void;
    };
  }
}
