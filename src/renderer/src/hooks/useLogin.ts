import { useMutation } from "@tanstack/react-query";
import { api } from "../api/client";
import { useAuthStore } from "../store/auth.store";
import { AxiosError } from "axios";
import { message } from "antd";

type ApiError = {
  message?: string;
};

type LoginPayload = {
  username: string;
  password: string;
};

export const useLogin = () => {
  const login = useAuthStore((s) => s.login);

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const res = await api.post("/api/pos/staff/login", payload);

      return res.data;
    },

    onSuccess: (data) => {
      login(data.access_token);
    },
    onError: (err: AxiosError<ApiError>) => {
      message.error(err.response?.data?.message ?? "Đăng nhập thất bại");
    }
  });
};
