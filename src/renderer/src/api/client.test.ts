import { AxiosHeaders } from "axios";
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@renderer/socket/socket", () => ({
  connectSocket: vi.fn(),
  disconnectSocket: vi.fn()
}));

import { connectSocket, disconnectSocket } from "@renderer/socket/socket";
import { useAuthStore } from "@renderer/store/auth.store";
import { api, initApi, refreshApi } from "./client";

const getRequestInterceptor = () =>
  (
    api.interceptors.request as unknown as {
      handlers: Array<{
        fulfilled: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig;
      }>;
    }
  ).handlers[0].fulfilled;

const getResponseRejectedInterceptor = () =>
  (
    api.interceptors.response as unknown as {
      handlers: Array<{ rejected: (error: AxiosError) => Promise<AxiosResponse> }>;
    }
  ).handlers[0].rejected;

const createRequestConfig = (
  overrides: Partial<InternalAxiosRequestConfig> = {}
): InternalAxiosRequestConfig => ({
  url: "/api/pos/order",
  method: "get",
  headers: new AxiosHeaders(),
  ...overrides
});

const createAxiosError = (
  config: InternalAxiosRequestConfig,
  overrides: Partial<AxiosError> = {}
): AxiosError =>
  ({
    name: "AxiosError",
    message: "Unauthorized",
    config,
    response: {
      status: 401,
      data: {},
      headers: {},
      statusText: "Unauthorized",
      config
    },
    isAxiosError: true,
    toJSON: () => ({}),
    ...overrides
  }) as AxiosError;

describe("api client interceptors", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await initApi("https://api.ncc.local");
  });

  it("adds baseURL and bearer token to outgoing requests", () => {
    useAuthStore.getState().login("access-token", "refresh-token", 123);
    const interceptor = getRequestInterceptor();

    const config = interceptor(createRequestConfig());

    expect(config.baseURL).toBe("https://api.ncc.local");
    expect(config.headers.Authorization).toBe("Bearer access-token");
  });

  it("refreshes the token, reconnects the socket, and retries the original request", async () => {
    useAuthStore.getState().login("expired-token", "refresh-token", 321);
    const responseInterceptor = getResponseRejectedInterceptor();
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => ({
      data: { ok: true },
      status: 200,
      statusText: "OK",
      headers: {},
      config
    }));

    api.defaults.adapter = adapter;
    vi.spyOn(refreshApi, "post").mockResolvedValue({
      data: {
        access_token: "fresh-token",
        refresh_token: "fresh-refresh-token"
      }
    } as AxiosResponse);

    const originalRequest = createRequestConfig({
      headers: new AxiosHeaders({ Authorization: "Bearer expired-token" })
    });

    const response = await responseInterceptor(createAxiosError(originalRequest));

    expect(refreshApi.post).toHaveBeenCalledWith("/api/pos/staff/refresh-token", {
      refreshToken: "refresh-token"
    });
    expect(connectSocket).toHaveBeenCalledWith("fresh-token");
    expect(useAuthStore.getState()).toMatchObject({
      token: "fresh-token",
      refreshToken: "fresh-refresh-token",
      userId: 321,
      isAuth: true
    });
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(adapter.mock.calls[0][0].headers.Authorization).toBe("Bearer fresh-token");
    expect(response.data).toEqual({ ok: true });
  });

  it("logs out and disconnects the socket when token refresh fails", async () => {
    useAuthStore.getState().login("expired-token", "refresh-token", 9);
    const responseInterceptor = getResponseRejectedInterceptor();
    const refreshError = createAxiosError(createRequestConfig(), {
      message: "Refresh failed"
    });

    vi.spyOn(refreshApi, "post").mockRejectedValue(refreshError);

    await expect(
      responseInterceptor(
        createAxiosError(
          createRequestConfig({
            headers: new AxiosHeaders({ Authorization: "Bearer expired-token" })
          })
        )
      )
    ).rejects.toBe(refreshError);

    expect(disconnectSocket).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState()).toMatchObject({
      token: null,
      refreshToken: null,
      userId: null,
      isAuth: false
    });
  });

  it("does not refresh requests that explicitly skip auth refresh", async () => {
    useAuthStore.getState().login("expired-token", "refresh-token", 9);
    const responseInterceptor = getResponseRejectedInterceptor();
    const error = createAxiosError(
      createRequestConfig({
        headers: new AxiosHeaders({ skipAuthRefresh: "true" })
      })
    );
    const refreshSpy = vi.spyOn(refreshApi, "post");

    await expect(responseInterceptor(error)).rejects.toBe(error);

    expect(refreshSpy).not.toHaveBeenCalled();
    expect(disconnectSocket).not.toHaveBeenCalled();
    expect(useAuthStore.getState().token).toBe("expired-token");
  });
});
