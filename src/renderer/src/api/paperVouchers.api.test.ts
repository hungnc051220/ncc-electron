import { getApiErrorMessage } from "@renderer/lib/apiError";
import { server } from "@renderer/test/msw/server";
import { useAuthStore } from "@renderer/store/auth.store";
import type { PaperVoucherBatch, PaperVoucherSummary } from "@shared/types";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, initApi } from "./client";
import { paperVouchersApi } from "./paperVouchers.api";

vi.mock("@renderer/socket/socket", () => ({
  connectSocket: vi.fn(),
  disconnectSocket: vi.fn()
}));

const API = "http://paper-voucher.test";
const BASE = `${API}/api/pos/paper-vouchers`;

const batch: PaperVoucherBatch = {
  id: 7,
  batchCode: "LÔ-007",
  name: "Voucher giấy 100.000đ",
  faceValue: 100000,
  totalQuantity: 10,
  usedCount: 0,
  remainingQuantity: 10,
  validFrom: null,
  expiresAt: "2026-12-31",
  isLocked: false,
  status: "active",
  note: null,
  images: [],
  createdAt: "2026-11-01 10:00:00",
  updatedAt: "2026-11-01 10:00:00",
  createdBy: "thungan",
  updatedBy: "thungan",
  lockedAt: null,
  lockedBy: null
};

const page = (data: unknown[]) => ({
  data,
  total: data.length,
  current: 1,
  pageCount: 1,
  pageSize: 0
});

const summary: PaperVoucherSummary = {
  totalBatches: 1,
  totalQuantity: 10,
  usedCount: 0,
  remainingQuantity: 10,
  totalFaceValue: 1000000,
  usedFaceValue: 0,
  remainingFaceValue: 1000000,
  countByStatus: { active: 1, upcoming: 0, expired: 0, locked: 0, depleted: 0 },
  businessDate: "2026-11-02"
};

const uploaded = (side: string) => ({
  url: `https://res.anvui.vn/attachments_ncc/admin/paper-vouchers/${side}.png`,
  fileName: `${side}.png`
});

const imageFile = (name: string) => new File(["png"], name, { type: "image/png" });

/** Ghi nhận mọi request tới API voucher giấy để kiểm tra thứ tự và nội dung. */
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

const businessError = (status: number, code: string, message: string) =>
  HttpResponse.json(
    { statusCode: status, code, message, timestamp: "2026-11-02T03:00:00.000Z" },
    { status }
  );

describe("paperVouchersApi", () => {
  let requests: ReturnType<typeof recordRequests>;

  beforeEach(async () => {
    await initApi(API);
    useAuthStore.getState().login("staff-token", "staff-refresh", 12);
    requests = recordRequests();
  });

  afterEach(() => {
    server.events.removeAllListeners();
  });

  it("maps paging, filters and sort to GET /batches and returns the page as-is", async () => {
    const response = { data: [batch], total: 41, current: 3, pageCount: 3, pageSize: 20 };
    server.use(http.get(`${BASE}/batches`, () => HttpResponse.json(response)));

    const result = await paperVouchersApi.getPage({
      current: 3,
      pageSize: 20,
      keyword: "lo-007",
      faceValue: 100000,
      status: "active",
      expiresFrom: "2026-12-31",
      expiresTo: "2026-12-31",
      sort: "expiresAt.asc"
    });

    expect(result).toEqual(response);
    const { url } = requests[0];
    expect(Object.fromEntries(url.searchParams)).toEqual({
      current: "3",
      pageSize: "20",
      keyword: "lo-007",
      faceValue: "100000",
      status: "active",
      expiresFrom: "2026-12-31",
      expiresTo: "2026-12-31",
      sort: "expiresAt.asc"
    });
  });

  it("sends noExpiry and omits empty params", async () => {
    server.use(http.get(`${BASE}/batches`, () => HttpResponse.json(page([]))));

    await paperVouchersApi.getPage({ current: 1, pageSize: 20, noExpiry: true, sort: undefined });

    expect(Object.fromEntries(requests[0].url.searchParams)).toEqual({
      current: "1",
      pageSize: "20",
      noExpiry: "true"
    });
  });

  it("loads every batch with pageSize=0 for filter options and POS", async () => {
    server.use(http.get(`${BASE}/batches`, () => HttpResponse.json(page([batch]))));

    expect(await paperVouchersApi.getAll()).toEqual([batch]);
    expect(requests[0].url.searchParams.get("pageSize")).toBe("0");
    expect(requests[0].url.searchParams.has("current")).toBe(false);
  });

  it("reads the summary, a batch detail and usages with the staff token", async () => {
    const usage = {
      id: 1,
      transactionId: "REQ-1",
      orderId: 99,
      batchId: 7,
      batchCode: "LÔ-007",
      quantity: 1,
      faceValue: 100000,
      appliedAmount: 90000,
      status: "applied",
      staffName: "Thu ngân",
      posShortName: "POS1",
      createdAt: "2026-11-02 09:00:00",
      reversedAt: null,
      reversedBy: null,
      reversalReason: null
    };
    let authorization: string | null = null;
    server.use(
      http.get(`${BASE}/summary`, ({ request }) => {
        authorization = request.headers.get("authorization");
        return HttpResponse.json(summary);
      }),
      http.get(`${BASE}/batches/7`, () => HttpResponse.json(batch)),
      http.get(`${BASE}/batches/7/usages`, () => HttpResponse.json(page([usage])))
    );

    expect(await paperVouchersApi.getSummary({ status: "active" })).toEqual(summary);
    expect(authorization).toBe("Bearer staff-token");
    expect(requests[0].url.searchParams.get("status")).toBe("active");
    expect(await paperVouchersApi.getById(7)).toEqual(batch);
    expect(await paperVouchersApi.getUsages(7)).toEqual([usage]);
    expect(requests[2].url.searchParams.get("pageSize")).toBe("0");
  });

  it("creates a batch (201) without image fields when no image is chosen", async () => {
    server.use(http.post(`${BASE}/batches`, () => HttpResponse.json(batch, { status: 201 })));

    const result = await paperVouchersApi.create({
      name: "Voucher giấy 100.000đ",
      faceValue: 100000,
      totalQuantity: 10,
      validFrom: null,
      expiresAt: "2026-12-31",
      note: null
    });

    expect(result).toEqual(batch);
    expect(requests).toHaveLength(1);
    expect(requests[0].body).toEqual({
      name: "Voucher giấy 100.000đ",
      faceValue: 100000,
      totalQuantity: 10,
      validFrom: null,
      expiresAt: "2026-12-31",
      note: null
    });
  });

  it("uploads chosen images as multipart before creating the batch with their URLs in order", async () => {
    // XHR của jsdom qua MSW không serialize được FormData, nên kiểm tra payload tại axios.
    const originalPost = api.post.bind(api);
    const postSpy = vi.spyOn(api, "post").mockImplementation((url, data, config) => {
      if (url.endsWith("/images")) {
        const file = (data as FormData).get("file") as File;
        return Promise.resolve({ data: uploaded(file.name.replace(".png", "")) });
      }
      return originalPost(url, data, config);
    });
    server.use(
      http.post(`${BASE}/batches`, () =>
        HttpResponse.json({ ...batch, images: [uploaded("anh-1")] }, { status: 201 })
      )
    );

    await paperVouchersApi.create({
      name: "Lô có ảnh",
      faceValue: 100000,
      totalQuantity: 10,
      images: [
        { file: imageFile("anh-1.png") },
        { file: imageFile("anh-2.png") },
        { file: imageFile("anh-3.png") }
      ]
    });

    const uploads = postSpy.mock.calls.filter(([url]) => url.endsWith("/images"));
    expect(uploads.map(([url]) => url)).toEqual(
      Array(3).fill("/api/pos/paper-vouchers/images")
    );
    expect(
      uploads.map(([, data]) => {
        expect(data).toBeInstanceOf(FormData);
        return ((data as FormData).get("file") as File).name;
      })
    ).toEqual(["anh-1.png", "anh-2.png", "anh-3.png"]);
    // Ảnh upload xong mới tạo lô; chỉ một request JSON tới /batches.
    expect(requests).toHaveLength(1);
    expect(requests[0].url.pathname).toBe("/api/pos/paper-vouchers/batches");
    expect(requests.at(-1)?.url.pathname).toBe("/api/pos/paper-vouchers/batches");
    expect(requests.at(-1)?.body).toEqual({
      name: "Lô có ảnh",
      faceValue: 100000,
      totalQuantity: 10,
      images: [uploaded("anh-1"), uploaded("anh-2"), uploaded("anh-3")]
    });
  });

  it("keeps (omits), clears ([]) or replaces the image list on update, keeping saved images", async () => {
    server.use(
      http.post(`${BASE}/images`, () => HttpResponse.json(uploaded("moi"), { status: 201 })),
      http.patch(`${BASE}/batches/7`, () => HttpResponse.json(batch))
    );
    const fields = { name: "Lô 7", faceValue: 100000, totalQuantity: 12 };
    const saved = { url: uploaded("cu").url, fileName: undefined };

    await paperVouchersApi.update({ id: 7, dto: fields });
    await paperVouchersApi.update({ id: 7, dto: { ...fields, images: [] } });
    await paperVouchersApi.update({
      id: 7,
      dto: { ...fields, images: [{ file: imageFile("moi.png") }, saved] }
    });

    const uploads = requests.filter((request) => request.url.pathname.endsWith("/images"));
    const patches = requests.filter((request) => request.method === "PATCH");
    expect(uploads).toHaveLength(1);
    expect(patches.map((request) => request.body)).toEqual([
      fields,
      { ...fields, images: [] },
      { ...fields, images: [uploaded("moi"), { url: saved.url, fileName: null }] }
    ]);
    expect(patches[0].body).not.toHaveProperty("images");
  });

  it("does not save the batch when an image upload fails", async () => {
    const createBatch = vi.fn(() => HttpResponse.json(batch, { status: 201 }));
    server.use(
      http.post(`${BASE}/images`, () =>
        businessError(502, "PAPER_VOUCHER_IMAGE_UPLOAD_FAILED", "Không tải được ảnh lên")
      ),
      http.post(`${BASE}/batches`, createBatch)
    );

    const error = await paperVouchersApi
      .create({
        name: "Lô",
        faceValue: 1,
        totalQuantity: 1,
        images: [{ file: imageFile("a.png") }]
      })
      .catch((reason: unknown) => reason);

    expect(getApiErrorMessage(error, "fallback")).toBe("Không tải được ảnh lên");
    expect(createBatch).not.toHaveBeenCalled();
  });

  it("maps a bare 413 from the upload limit to a Vietnamese message", async () => {
    server.use(http.post(`${BASE}/images`, () => new HttpResponse(null, { status: 413 })));

    await expect(
      paperVouchersApi.create({
        name: "Lô",
        faceValue: 1,
        totalQuantity: 1,
        images: [{ file: imageFile("big.png") }]
      })
    ).rejects.toThrow("Ảnh phải có dung lượng tối đa 5 MB");
  });

  it("locks with PATCH /lock and deletes with 204 No Content", async () => {
    server.use(
      http.patch(`${BASE}/batches/7/lock`, () => HttpResponse.json({ ...batch, isLocked: true })),
      http.delete(`${BASE}/batches/7`, () => new HttpResponse(null, { status: 204 }))
    );

    expect(await paperVouchersApi.setLocked({ id: 7, isLocked: true })).toMatchObject({
      isLocked: true
    });
    expect(requests[0].body).toEqual({ isLocked: true });
    await expect(paperVouchersApi.delete(7)).resolves.toBeUndefined();
    expect(requests[1]).toMatchObject({ method: "DELETE" });
  });

  it("surfaces backend messages for 400, 404 and 422 errors", async () => {
    server.use(
      http.delete(`${BASE}/batches/7`, () =>
        businessError(400, "PAPER_VOUCHER_BATCH_IN_USE", "Lô đã có lượt sử dụng, không thể xóa")
      ),
      http.get(`${BASE}/batches/8`, () =>
        businessError(404, "PAPER_VOUCHER_BATCH_NOT_FOUND", "Không tìm thấy lô voucher giấy")
      ),
      http.post(`${BASE}/batches`, () =>
        HttpResponse.json(
          {
            statusCode: 422,
            message: ["name should not be empty", "faceValue must be an integer number"],
            error: "Unprocessable Entity"
          },
          { status: 422 }
        )
      )
    );
    const messageOf = (promise: Promise<unknown>) =>
      promise.then(
        () => "resolved",
        (error: unknown) => getApiErrorMessage(error, "fallback")
      );

    expect(await messageOf(paperVouchersApi.delete(7))).toBe(
      "Lô đã có lượt sử dụng, không thể xóa"
    );
    expect(await messageOf(paperVouchersApi.getById(8))).toBe("Không tìm thấy lô voucher giấy");
    expect(
      await messageOf(paperVouchersApi.create({ name: "", faceValue: 0, totalQuantity: 1 }))
    ).toBe("name should not be empty, faceValue must be an integer number");
  });

  it("rejects 401 after the refresh token is refused and logs out", async () => {
    server.use(
      http.get(`${BASE}/summary`, () =>
        HttpResponse.json({ statusCode: 401, message: "Unauthorized" }, { status: 401 })
      ),
      http.post(`${API}/api/pos/staff/refresh-token`, () =>
        HttpResponse.json({ statusCode: 403, message: "Access Denied" }, { status: 403 })
      )
    );

    await expect(paperVouchersApi.getSummary()).rejects.toMatchObject({
      response: { status: 403 }
    });
    expect(useAuthStore.getState().token).toBeNull();
  });

  it("rejects with the API failure", async () => {
    server.use(
      http.get(`${BASE}/batches`, () => HttpResponse.error()),
      http.get(`${BASE}/summary`, () =>
        HttpResponse.json({ statusCode: 500, message: "Internal server error" }, { status: 500 })
      )
    );

    await expect(paperVouchersApi.getAll()).rejects.toThrow();
    await expect(paperVouchersApi.getPage({ current: 1, pageSize: 20 })).rejects.toThrow();
    await expect(paperVouchersApi.getSummary()).rejects.toMatchObject({
      response: { status: 500 }
    });
  });
});
