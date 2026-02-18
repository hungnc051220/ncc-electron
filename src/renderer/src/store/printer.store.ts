import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PrinterState {
  printers: Electron.PrinterInfo[];
  selectedPrinter?: string;
  loading: boolean;

  fetchPrinters: () => Promise<void>;
  setSelectedPrinter: (name: string) => void;
}

export const usePrinterStore = create<PrinterState>()(
  persist(
    (set, get) => ({
      printers: [],
      selectedPrinter: undefined,
      loading: false,

      fetchPrinters: async () => {
        set({ loading: true });

        const printers = await window.api.getPrinters();
        const savedPrinter = get().selectedPrinter;

        const stillExists = printers.find((p) => p.name === savedPrinter);

        set({
          printers,
          selectedPrinter: stillExists ? savedPrinter : undefined,
          loading: false
        });
      },

      setSelectedPrinter: (name) => set({ selectedPrinter: name })
    }),
    {
      name: "printer-storage"
    }
  )
);
