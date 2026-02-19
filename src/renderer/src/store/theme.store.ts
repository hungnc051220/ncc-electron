import { create } from "zustand";
import { AppTheme } from "@shared/types";

interface ThemeState {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: "light",
  setTheme: (theme) => set({ theme })
}));
