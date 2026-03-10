import axios, { AxiosError, AxiosResponse, AxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/auth.store";
import { connectSocket, disconnectSocket } from "@renderer/socket/socket";

interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

interface RefreshResponse {
  access_token: string;
  refresh_token: string;
}

let apiBaseUrl = "";

export const initApi = async (url: string) => {
  apiBaseUrl = url;
};

export const refreshApi = axios.create();

refreshApi.interceptors.request.use((config) => {
  config.baseURL = apiBaseUrl;
  return config;
});

export const api = axios.create();

let isRefreshing = false;
type FailedQueueItem = {
  resolve: (token: string) => void;
  reject: (error: AxiosError) => void;
};

let failedQueue: FailedQueueItem[] = [];

const processQueue = (error: AxiosError | null, token: string | null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });

  failedQueue = [];
};

api.interceptors.request.use((config) => {
  config.baseURL = apiBaseUrl;
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomAxiosRequestConfig;

    if (!originalRequest || !error.response) {
      return Promise.reject(error);
    }

    const shouldSkip = originalRequest.headers?.skipAuthRefresh;

    if (error.response.status === 401 && !originalRequest._retry && !shouldSkip) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = useAuthStore.getState().refreshToken;

      try {
        const response = await refreshApi.post<RefreshResponse>("/api/pos/staff/refresh-token", {
          refreshToken
        });

        const { access_token, refresh_token: newRefreshToken } = response.data;

        useAuthStore.getState().login(access_token, newRefreshToken);
        connectSocket(access_token);

        processQueue(null, access_token);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
        }

        return api(originalRequest);
      } catch (refreshError) {
        const typedError = refreshError as AxiosError;

        processQueue(typedError, null);

        useAuthStore.getState().logout();
        disconnectSocket();

        return Promise.reject(typedError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
