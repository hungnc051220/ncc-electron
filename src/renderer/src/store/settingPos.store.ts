import { create } from "zustand";
import { persist } from "zustand/middleware";

type SettingPosState = {
  posName: string | undefined;
  posShortName: string | undefined;
  setPos: (posName: string, posShortName: string) => void;
};

export const useSettingPosStore = create<SettingPosState>()(
  persist(
    (set) => ({
      posName: undefined,
      posShortName: undefined,
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
