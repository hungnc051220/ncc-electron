import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type AuthState = {
  token: string | null;
  refreshToken: string | null;
  userId: number | null;
  isAuth: boolean;

  login: (token: string, refreshToken: string, userId: number) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      userId: null,
      isAuth: false,

      login: (token, refreshToken, userId) => set({ token, refreshToken, userId, isAuth: true }),

      logout: () => set({ token: null, isAuth: false })
    }),
    {
      name: "pos-auth",
      storage: createJSONStorage(() => sessionStorage)
    }
  )
);
