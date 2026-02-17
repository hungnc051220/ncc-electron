import { create } from "zustand";
import { persist } from "zustand/middleware";

type SettingPosState = {
  posName: string | null;
  posShortName: string | null;
  setPos: (posName: string, posShortName: string) => void;
};

export const useSettingPosStore = create<SettingPosState>()(
  persist(
    (set) => ({
      posName: null,
      posShortName: null,
      setPos: (posName, posShortName) => set({ posName, posShortName })
    }),
    {
      name: "pos-settings",
      onRehydrateStorage: () => (state) => {
        if (!state?.posName || !state?.posShortName) {
          state?.setPos("POS Machine 1", "M11");
          console.log("Default POS persisted!");
        }
      }
    }
  )
);
