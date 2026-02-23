import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type AuthState = {
  token: string | null;
  refreshToken: string | null;
  userId: number | null;
  isAuth: boolean;

  login: (token: string, refreshToken: string) => void;
  setUserId: (userId: number) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      userId: null,
      isAuth: false,

      login: (token, refreshToken) => set({ token, refreshToken, isAuth: true }),
      setUserId: (userId) => set({ userId }),
      logout: () => set({ token: null, refreshToken: null, userId: null, isAuth: false })
    }),
    {
      name: "pos-auth",
      storage: createJSONStorage(() => sessionStorage)
    }
  )
);
