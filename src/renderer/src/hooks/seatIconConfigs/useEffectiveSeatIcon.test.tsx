import { initApi } from "@renderer/api/client";
import { seatIconConfigsApi } from "@renderer/api/seatIconConfigs.api";
import { useAuthStore } from "@renderer/store/auth.store";
import { server } from "@renderer/test/msw/server";
import type { EffectiveSeatIcon, SeatIconConfig, SeatIconScope } from "@shared/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { seatIconConfigKeys } from "./keys";
import { useEffectiveSeatIcon } from "./useEffectiveSeatIcon";
import { useDeleteSeatIconConfig, useUpdateSeatIconConfig } from "./useSeatIconConfigMutations";

vi.mock("@renderer/socket/socket", () => ({
  connectSocket: vi.fn(),
  disconnectSocket: vi.fn()
}));

const API = "http://seat-icon-effective.test";
const URL_OF = (name: string) =>
  `https://res.anvui.vn/demo/image/upload/v1/attachments_ncc/admin/seat-icons/${name}.png`;

const configOf = (
  id: number,
  scope: SeatIconScope,
  scopeId: number | null,
  isEnabled = true
): SeatIconConfig => ({
  id,
  targetType: "SOLD",
  scope,
  scopeId,
  scopeName: null,
  scopeTargetMissing: false,
  imageUrl: URL_OF(`${scope.toLowerCase()}-${id}`),
  isEnabled,
  version: 1,
  createdAt: "2026-11-20T03:15:00.000Z",
  createdBy: "admin",
  updatedAt: null,
  updatedBy: null
});

/** Mô phỏng backend: cấu hình đang bật, ưu tiên FILM > ROOM > GLOBAL > DEFAULT. */
let configs: SeatIconConfig[] = [];
let effectiveCalls: string[] = [];
const resolveEffective = (filmId: number | null, roomId: number | null): EffectiveSeatIcon => {
  const enabled = configs.filter((config) => config.isEnabled);
  const hit =
    enabled.find((config) => config.scope === "FILM" && config.scopeId === filmId) ??
    enabled.find((config) => config.scope === "ROOM" && config.scopeId === roomId) ??
    enabled.find((config) => config.scope === "GLOBAL");
  return hit
    ? {
        targetType: "SOLD",
        source: hit.scope,
        hasIcon: true,
        configId: hit.id,
        scope: hit.scope,
        scopeId: hit.scopeId,
        imageUrl: hit.imageUrl,
        version: hit.version,
        updatedAt: null
      }
    : {
        targetType: "SOLD",
        source: "DEFAULT",
        hasIcon: false,
        configId: null,
        scope: null,
        scopeId: null,
        imageUrl: null,
        version: null,
        updatedAt: null
      };
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
};

beforeEach(async () => {
  await initApi(API);
  useAuthStore.getState().login("staff-token", "staff-refresh", 12);
  configs = [];
  effectiveCalls = [];
  server.use(
    http.get(`${API}/api/pos/seat-icon-configs/effective`, ({ request }) => {
      const params = new URL(request.url).searchParams;
      effectiveCalls.push(params.toString());
      const filmId = params.get("filmId") ? Number(params.get("filmId")) : null;
      const roomId = params.get("roomId") ? Number(params.get("roomId")) : null;
      return HttpResponse.json(resolveEffective(filmId, roomId));
    })
  );
});

const renderEffective = (initial: { filmId?: number; roomId?: number }) => {
  const { queryClient, wrapper } = createWrapper();
  const view = renderHook(
    (props: { filmId?: number; roomId?: number }) => useEffectiveSeatIcon(props),
    {
      wrapper,
      initialProps: initial
    }
  );
  return { ...view, queryClient };
};

describe("useEffectiveSeatIcon", () => {
  it.each<[string, SeatIconConfig[], string | null]>([
    ["no configuration", [], null],
    ["GLOBAL only", [configOf(1, "GLOBAL", null)], URL_OF("global-1")],
    ["ROOM only", [configOf(2, "ROOM", 20)], URL_OF("room-2")],
    ["FILM only", [configOf(3, "FILM", 10)], URL_OF("film-3")],
    [
      "FILM > ROOM > GLOBAL",
      [configOf(1, "GLOBAL", null), configOf(2, "ROOM", 20), configOf(3, "FILM", 10)],
      URL_OF("film-3")
    ],
    [
      "ROOM > GLOBAL when the film config is disabled",
      [configOf(1, "GLOBAL", null), configOf(2, "ROOM", 20), configOf(3, "FILM", 10, false)],
      URL_OF("room-2")
    ],
    [
      "configurations of another film/room are ignored",
      [configOf(2, "ROOM", 99), configOf(3, "FILM", 98)],
      null
    ]
  ])("%s", async (_, fixture, expectedUrl) => {
    configs = fixture;
    const { result } = renderEffective({ filmId: 10, roomId: 20 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.imageUrl).toBe(expectedUrl);
    expect(effectiveCalls).toEqual(["targetType=SOLD&filmId=10&roomId=20"]);
  });

  it("does not call the API before the screening is loaded", () => {
    const { result } = renderEffective({});

    expect(result.current.fetchStatus).toBe("idle");
    expect(effectiveCalls).toHaveLength(0);
  });

  it("never shows the previous screening icon while the next one loads", async () => {
    configs = [configOf(3, "FILM", 10)];
    const { result, rerender } = renderEffective({ filmId: 10, roomId: 20 });
    await waitFor(() => expect(result.current.imageUrl).toBe(URL_OF("film-3")));

    rerender({ filmId: 11, roomId: 21 });

    expect(result.current.imageUrl).toBeNull();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.imageUrl).toBeNull();
    expect(effectiveCalls).toEqual([
      "targetType=SOLD&filmId=10&roomId=20",
      "targetType=SOLD&filmId=11&roomId=21"
    ]);
  });

  it("keeps the default UI on network/server errors without retrying", async () => {
    server.use(
      http.get(`${API}/api/pos/seat-icon-configs/effective`, () => {
        effectiveCalls.push("error");
        return HttpResponse.json({ code: "SEAT_ICON_CONFIG_UNAVAILABLE" }, { status: 503 });
      })
    );
    const { result } = renderEffective({ filmId: 10, roomId: 20 });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.imageUrl).toBeNull();
    expect(effectiveCalls).toEqual(["error"]);
  });

  it("refetch (sơ đồ bấm làm mới) reads the latest configuration", async () => {
    configs = [configOf(1, "GLOBAL", null)];
    const { result } = renderEffective({ filmId: 10, roomId: 20 });
    await waitFor(() => expect(result.current.imageUrl).toBe(URL_OF("global-1")));

    configs = [configOf(1, "GLOBAL", null), configOf(2, "ROOM", 20)];
    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.imageUrl).toBe(URL_OF("room-2")));
  });
});

describe("seat icon mutations refresh the effective icon", () => {
  it("re-reads the open screening icon after an admin saves or deletes in this window", async () => {
    configs = [configOf(1, "GLOBAL", null), configOf(2, "ROOM", 20)];
    // Spy trước khi render: `useMutation` giữ `mutationFn` của lần render gần nhất.
    const updateSpy = vi.spyOn(seatIconConfigsApi, "update").mockImplementation(async ({ id }) => {
      configs = configs.map((config) =>
        config.id === id ? { ...config, isEnabled: false, version: 2 } : config
      );
      return configs.find((config) => config.id === id)!;
    });
    const deleteSpy = vi.spyOn(seatIconConfigsApi, "delete").mockImplementation(async (id) => {
      configs = configs.filter((config) => config.id !== id);
    });
    const { queryClient, wrapper } = createWrapper();
    const effective = renderHook(() => useEffectiveSeatIcon({ filmId: 10, roomId: 20 }), {
      wrapper
    });
    const update = renderHook(useUpdateSeatIconConfig, { wrapper });
    const remove = renderHook(useDeleteSeatIconConfig, { wrapper });
    await waitFor(() => expect(effective.result.current.imageUrl).toBe(URL_OF("room-2")));
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await update.result.current.mutateAsync({
        id: 2,
        dto: {
          targetType: "SOLD",
          scope: "ROOM",
          scopeId: 20,
          imageUrl: URL_OF("room-2"),
          isEnabled: false,
          version: 1
        }
      });
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: seatIconConfigKeys.all });
    await waitFor(() => expect(effective.result.current.imageUrl).toBe(URL_OF("global-1")));

    await act(async () => {
      await remove.result.current.mutateAsync(1);
    });
    await waitFor(() => expect(effective.result.current.imageUrl).toBeNull());
    updateSpy.mockRestore();
    deleteSpy.mockRestore();
  });

  it("refreshes after a 409 version conflict so the UI drops stale data", async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const update = renderHook(useUpdateSeatIconConfig, { wrapper });
    server.use(
      http.put(`${API}/api/pos/seat-icon-configs/2`, () =>
        HttpResponse.json(
          { statusCode: 409, code: "SEAT_ICON_CONFIG_CHANGED", message: "x" },
          { status: 409 }
        )
      )
    );

    await act(async () => {
      await update.result.current
        .mutateAsync({
          id: 2,
          dto: {
            targetType: "SOLD",
            scope: "ROOM",
            scopeId: 20,
            imageUrl: URL_OF("room-2"),
            isEnabled: true,
            version: 1
          }
        })
        .catch(() => undefined);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: seatIconConfigKeys.all });
  });
});
