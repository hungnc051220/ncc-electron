import { useMutation } from "@tanstack/react-query";
import { api } from "../api/client";
import { useAuthStore } from "../store/auth.store";
import { AxiosError } from "axios";
import { message } from "antd";
import { jwtDecode } from "jwt-decode";
import { JwtPayload } from "@shared/types";
import { connectSocket } from "@renderer/socket/socket";

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
      const res = await api.post("/api/pos/staff/login", payload, {
        headers: { skipAuthRefresh: true }
      });

      return res.data;
    },

    onSuccess: (data) => {
      const decoded = jwtDecode<JwtPayload>(data.access_token);
      const userId = decoded?.user_id;
      login(data.access_token, data.refresh_token, Number(userId));
      connectSocket(data.access_token);
    },
    onError: (err: AxiosError<ApiError>) => {
      message.error(err.response?.data?.message ?? "Đăng nhập thất bại");
    }
  });
};
