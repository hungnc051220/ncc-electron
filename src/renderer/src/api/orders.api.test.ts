import { describe, expect, it, vi, afterEach } from "vitest";
import { api } from "@renderer/api/client";
import { ordersApi } from "./orders.api";

describe("ordersApi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("serializes combined filters for getAll", async () => {
    const getSpy = vi.spyOn(api, "get").mockResolvedValue({
      data: {
        data: [],
        pageCount: 0,
        totalCount: 0
      }
    });

    await ordersApi.getAll({
      current: 1,
      pageSize: 20,
      searchText: "ve-thang-3",
      isOnline: true,
      fromDate: "2026-03-01",
      toDate: "2026-03-31"
    });

    expect(getSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        encodeURIComponent(
          JSON.stringify({
            isOnline: true,
            IsInvitation: false,
            IsContract: false,
            Deleted: 0,
            keyword: "ve-thang-3",
            createdOnUtc: {
              between: ["2026-03-01", "2026-03-31"]
            }
          })
        )
      )
    );
  });

  it("keeps explicit false filters and omits empty values", async () => {
    const getSpy = vi.spyOn(api, "get").mockResolvedValue({
      data: {
        data: [],
        pageCount: 0,
        totalCount: 0
      }
    });

    await ordersApi.getAll({
      current: 2,
      pageSize: 10,
      id: "ORD-22",
      phoneNumber: "0987654321",
      email: "ncc@example.com",
      isInvitation: false
    });

    const requestedUrl = getSpy.mock.calls[0][0];

    expect(requestedUrl).toContain("/api/pos/order?");
    expect(requestedUrl).toContain("current=2");
    expect(requestedUrl).toContain("pageSize=10");
    expect(requestedUrl).toContain(
      `filter=${encodeURIComponent(
        JSON.stringify({
          id: "ORD-22",
          customerPhone: "0987654321",
          customerEmail: "ncc@example.com",
          isInvitation: false
        })
      )}`
    );
  });

  it("skips the filter param when getAll has no filters", async () => {
    const getSpy = vi.spyOn(api, "get").mockResolvedValue({
      data: {
        data: [],
        pageCount: 0,
        totalCount: 0
      }
    });

    await ordersApi.getAll({
      current: 1,
      pageSize: 50
    });

    expect(getSpy).toHaveBeenCalledWith("/api/pos/order?current=1&pageSize=50");
  });

  it("omits empty optional params when marking orders as printed", async () => {
    const patchSpy = vi.spyOn(api, "patch").mockResolvedValue({
      data: { success: true }
    });

    await ordersApi.markPrinted({
      orderId: 88,
      posShortName: ""
    });

    expect(patchSpy).toHaveBeenCalledWith("/api/pos/order/print?orderId=88");
  });

  it("serializes both params when unmarking printed orders", async () => {
    const patchSpy = vi.spyOn(api, "patch").mockResolvedValue({
      data: { success: true }
    });

    await ordersApi.unmarkPrinted({
      orderId: 99,
      posShortName: "POS-01"
    });

    expect(patchSpy).toHaveBeenCalledWith(
      "/api/pos/order/unmark-print?orderId=99&posShortName=POS-01"
    );
  });
});
