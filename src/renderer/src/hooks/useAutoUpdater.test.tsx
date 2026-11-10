import { act, renderHook, screen, waitFor } from "@testing-library/react";
import { App } from "antd";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UpdateErrorPayload, UpdatePolicy } from "@shared/types";
import { useAutoUpdater } from "./useAutoUpdater";

type ErrorListener = (payload: unknown) => void;

const pausedPolicy: UpdatePolicy = {
  enabled: false,
  latestVersion: "1.0.122",
  minSupportedVersion: "1.0.91",
  mode: "optional"
};

const wrapper = ({ children }: { children: ReactNode }) => <App>{children}</App>;

const createApiMock = (policy: UpdatePolicy) => {
  const listeners: { error?: ErrorListener } = {};
  const api = {
    getVersion: vi.fn(async () => "1.0.120"),
    getUpdatePolicy: vi.fn(async () => policy),
    checkUpdate: vi.fn(async () => ({ status: "checked" as const, info: null })),
    startDownload: vi.fn(async () => undefined),
    install: vi.fn(async () => undefined),
    quitApp: vi.fn(),
    onAvailable: vi.fn(() => () => undefined),
    onUpdatePolicy: vi.fn(() => () => undefined),
    onProgress: vi.fn(() => () => undefined),
    onReady: vi.fn(() => () => undefined),
    onError: vi.fn((cb: ErrorListener) => {
      listeners.error = cb;
      return () => undefined;
    })
  };

  return { api, emitError: (payload: unknown) => act(() => listeners.error?.(payload)) };
};

describe("useAutoUpdater", () => {
  let originalApi: typeof window.api;

  beforeEach(() => {
    originalApi = window.api;
  });

  afterEach(() => {
    window.api = originalApi;
  });

  it("shows a short friendly notification instead of the raw technical error", async () => {
    const { api, emitError } = createApiMock({ ...pausedPolicy, enabled: true });
    window.api = api as unknown as typeof window.api;
    renderHook(() => useAutoUpdater(), { wrapper });
    await waitFor(() => expect(api.onError).toHaveBeenCalled());

    await emitError('HttpError: 404 "url: https://github.com/o/r/releases.atom"\nHeaders: {}');

    expect(await screen.findByText("Cập nhật không thành công")).toBeInTheDocument();
    expect(
      screen.getByText("Cập nhật ứng dụng không thành công. Vui lòng thử lại.")
    ).toBeInTheDocument();
    expect(screen.queryByText(/HttpError|github\.com|Headers/)).not.toBeInTheDocument();
  });

  it("does not stack duplicate notifications when the same error repeats", async () => {
    const { api, emitError } = createApiMock({ ...pausedPolicy, enabled: true });
    window.api = api as unknown as typeof window.api;
    renderHook(() => useAutoUpdater(), { wrapper });
    await waitFor(() => expect(api.onError).toHaveBeenCalled());
    const inputPayload: UpdateErrorPayload = {
      code: "UPDATE_NETWORK",
      stage: "download",
      retryable: true
    };

    await emitError(inputPayload);
    await emitError(inputPayload);
    await emitError(inputPayload);

    expect(await screen.findAllByText("Tải bản cập nhật thất bại")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /Thử lại/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đóng" })).toBeInTheDocument();
  });

  it("offers no retry for install failures", async () => {
    const { api, emitError } = createApiMock({ ...pausedPolicy, enabled: true });
    window.api = api as unknown as typeof window.api;
    renderHook(() => useAutoUpdater(), { wrapper });
    await waitFor(() => expect(api.onError).toHaveBeenCalled());

    await emitError({ code: "UPDATE_INSTALL_FAILED", stage: "install", retryable: false });

    expect(
      await screen.findByText("Không thể cài đặt bản cập nhật. Vui lòng liên hệ bộ phận kỹ thuật.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Thử lại/ })).not.toBeInTheDocument();
  });

  it("does not invite or start an update when the policy is paused", async () => {
    const { api } = createApiMock(pausedPolicy);
    api.checkUpdate.mockResolvedValue({ status: "disabled" } as never);
    window.api = api as unknown as typeof window.api;
    const { result } = renderHook(() => useAutoUpdater(), { wrapper });
    await waitFor(() => expect(result.current.policy).toEqual(pausedPolicy));

    await act(() => result.current.showVersionInfo());

    expect(await screen.findByText("Bạn đang dùng phiên bản mới nhất")).toBeInTheDocument();
    expect(screen.queryByText("Đã tìm thấy phiên bản mới")).not.toBeInTheDocument();
    expect(api.startDownload).not.toHaveBeenCalled();
  });

  it("does not open the version modal when the manual check fails", async () => {
    const { api } = createApiMock({ ...pausedPolicy, enabled: true });
    api.checkUpdate.mockResolvedValue({
      status: "failed",
      error: { code: "UPDATE_NETWORK", stage: "check", retryable: true }
    } as never);
    window.api = api as unknown as typeof window.api;
    const { result } = renderHook(() => useAutoUpdater(), { wrapper });

    await act(() => result.current.showVersionInfo());

    expect(screen.queryByText("Bạn đang dùng phiên bản mới nhất")).not.toBeInTheDocument();
    expect(screen.queryByText("Đã tìm thấy phiên bản mới")).not.toBeInTheDocument();
  });

  it("does not surface an unhandled rejection when the check IPC itself fails", async () => {
    const { api } = createApiMock({ ...pausedPolicy, enabled: true });
    api.checkUpdate.mockRejectedValue(new Error("Error invoking remote method 'app:check-update'"));
    window.api = api as unknown as typeof window.api;
    const { result } = renderHook(() => useAutoUpdater(), { wrapper });
    await waitFor(() => expect(api.onError).toHaveBeenCalled());

    let actualError: unknown = null;
    await act(async () => {
      await result.current.showVersionInfo().catch((error: unknown) => {
        actualError = error;
      });
    });

    expect(actualError).toBeNull();

    expect(await screen.findByText("Cập nhật không thành công")).toBeInTheDocument();
    expect(screen.queryByText(/invoking remote method/)).not.toBeInTheDocument();
  });
});
