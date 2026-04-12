import { create } from "zustand";
import { persist } from "zustand/middleware";

export const DEFAULT_BRANCH_SETTINGS = {
  cinemaName: "TRUNG TÂM CHIẾU PHIM QUỐC GIA",
  address: "Số 87 Láng Hạ, Ô Chợ Dừa, Hà Nội"
} as const;

type SettingBranchState = {
  cinemaName: string;
  address: string;
  setBranch: (cinemaName: string, address: string) => void;
};

export const useSettingBranchStore = create<SettingBranchState>()(
  persist(
    (set) => ({
      cinemaName: DEFAULT_BRANCH_SETTINGS.cinemaName,
      address: DEFAULT_BRANCH_SETTINGS.address,
      setBranch: (cinemaName, address) => set({ cinemaName, address })
    }),
    {
      name: "branch-settings",
      onRehydrateStorage: () => (state) => {
        if (!state?.cinemaName || !state?.address) {
          state?.setBranch(DEFAULT_BRANCH_SETTINGS.cinemaName, DEFAULT_BRANCH_SETTINGS.address);
        }
      }
    }
  )
);
