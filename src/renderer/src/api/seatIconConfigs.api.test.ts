import { useAuthStore } from "@renderer/store/auth.store";
import { server } from "@renderer/test/msw/server";
import type { SeatIconConfig } from "@shared/types";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, initApi } from "./client";
import { SEAT_ICON_IMAGE_TOO_LARGE_MESSAGE, seatIconConfigsApi } from "./seatIconConfigs.api";

vi.mock("@renderer/socket/socket", () => ({
  connectSocket: vi.fn(),
  disconnectSocket: vi.fn()
}));

const API = "http://seat-icon.test";
const BASE = `${API}/api/pos/seat-icon-configs`;

const config: SeatIconConfig = {
  id: 5,
  targetType: "SOLD",
  scope: "ROOM",
  scopeId: 12,
  scopeName: "Phòng 1",
  scopeTargetMissing: false,
  imageUrl: "https://res.anvui.vn/demo/image/upload/v1/attachments_ncc/admin/seat-icons/a.png",
  isEnabled: true,
  version: 3,
  createdAt: "2026-11-20T03:15:00.000Z",
  createdBy: "admin",
  updatedAt: null,
  updatedBy: null
};

const recordRequests = () => {
  const requests: { method: string; url: URL; body?: unknown }[] = [];
  server.events.on("request:start", async ({ request }) => {
    const contentType = request.headers.get("content-type");
    const body = contentType?.includes("application/json")
      ? await request.clone().json()
      : undefined;
    requests.push({ method: request.method, url: new URL(request.url), body });
  });
  return requests;
};

describe("seatIconConfigsApi", () => {
  let requests: ReturnType<typeof recordRequests>;

  beforeEach(async () => {
    await initApi(API);
    useAuthStore.getState().login("staff-token", "staff-refresh", 12);
    requests = recordRequests();
  });

  afterEach(() => {
    server.events.removeAllListeners();
  });

  it("sends list filters and omits empty ones", async () => {
    const page = { data: [config], total: 1, current: 2, pageSize: 20, pageCount: 1 };
    server.use(http.get(BASE, () => HttpResponse.json(page)));

    const result = await seatIconConfigsApi.getPage({
      targetType: "SOLD",
      scope: "ROOM",
      isEnabled: false,
      keyword: "",
      current: 2,
      pageSize: 20
    });

    expect(result).toEqual(page);
    expect(Object.fromEntries(requests[0].url.searchParams)).toEqual({
      targetType: "SOLD",
      scope: "ROOM",
      isEnabled: "false",
      current: "2",
      pageSize: "20"
    });
  });

  it("loads every configuration with pageSize=0", async () => {
    server.use(
      http.get(BASE, () =>
        HttpResponse.json({ data: [config], total: 1, current: 1, pageSize: 0, pageCount: 1 })
      )
    );

    await expect(seatIconConfigsApi.getAll()).resolves.toEqual([config]);
    expect(requests[0].url.searchParams.get("pageSize")).toBe("0");
  });

  it("creates with the documented body and updates with PUT + version", async () => {
    server.use(
      http.post(BASE, () => HttpResponse.json(config, { status: 201 })),
      http.put(`${BASE}/5`, () => HttpResponse.json({ ...config, version: 4 }))
    );
    const dto = {
      targetType: "SOLD" as const,
      scope: "ROOM" as const,
      scopeId: 12,
      imageUrl: config.imageUrl,
      isEnabled: true
    };

    await seatIconConfigsApi.create(dto);
    await seatIconConfigsApi.update({ id: 5, dto: { ...dto, isEnabled: false, version: 3 } });

    expect(requests.map(({ method, url }) => `${method} ${url.pathname}`)).toEqual([
      "POST /api/pos/seat-icon-configs",
      "PUT /api/pos/seat-icon-configs/5"
    ]);
    expect(requests[0].body).toEqual(dto);
    expect(requests[1].body).toEqual({ ...dto, isEnabled: false, version: 3 });
  });

  it("deletes by id", async () => {
    server.use(http.delete(`${BASE}/5`, () => HttpResponse.json({ id: 5, deleted: true })));

    await seatIconConfigsApi.delete(5);

    expect(requests[0].method).toBe("DELETE");
  });

  it("uploads the file as multipart field `file` to /images", async () => {
    // XHR của jsdom qua MSW không serialize được FormData, nên kiểm tra payload tại axios.
    const uploaded = {
      url: config.imageUrl,
      fileName: "icon.png",
      mimeType: "image/png",
      width: 256,
      height: 256,
      size: 1000,
      isSquare: true
    };
    const postSpy = vi
      .spyOn(api, "post")
      .mockResolvedValue({ data: uploaded } as Awaited<ReturnType<typeof api.post>>);

    const result = await seatIconConfigsApi.uploadImage(
      new File(["png"], "icon.png", { type: "image/png" })
    );

    expect(postSpy).toHaveBeenCalledWith("/api/pos/seat-icon-configs/images", expect.any(FormData));
    const form = postSpy.mock.calls[0][1] as FormData;
    expect((form.get("file") as File).name).toBe("icon.png");
    expect(result).toEqual(uploaded);
    postSpy.mockRestore();
  });

  it("turns the multipart 413 (no code) into the 1 MB message", async () => {
    server.use(http.post(`${BASE}/images`, () => new HttpResponse(null, { status: 413 })));

    await expect(
      seatIconConfigsApi.uploadImage(new File(["png"], "big.png", { type: "image/png" }))
    ).rejects.toThrow(SEAT_ICON_IMAGE_TOO_LARGE_MESSAGE);
  });

  it("asks /effective with filmId + roomId of the screening and targetType SOLD", async () => {
    const effective = {
      targetType: "SOLD",
      source: "FILM",
      hasIcon: true,
      configId: 7,
      scope: "FILM",
      scopeId: 123,
      imageUrl: config.imageUrl,
      version: 2,
      updatedAt: "2026-11-20T03:15:00.000Z"
    };
    server.use(http.get(`${BASE}/effective`, () => HttpResponse.json(effective)));

    await expect(seatIconConfigsApi.getEffective({ filmId: 123, roomId: 12 })).resolves.toEqual(
      effective
    );
    expect(Object.fromEntries(requests[0].url.searchParams)).toEqual({
      targetType: "SOLD",
      filmId: "123",
      roomId: "12"
    });
  });
});
