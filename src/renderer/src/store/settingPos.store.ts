import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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
      storage: createJSONStorage(() => localStorage)
    }
  )
);
