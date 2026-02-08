import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type AuthState = {
  token: string | null;
  isAuth: boolean;

  login: (token: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      isAuth: false,

      login: (token) => set({ token, isAuth: true }),

      logout: () => set({ token: null, isAuth: false })
    }),
    {
      name: "pos-auth",
      storage: createJSONStorage(() => sessionStorage)
    }
  )
);
