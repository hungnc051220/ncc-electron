import { describe, expect, it, vi, afterEach } from "vitest";
import { api } from "@renderer/api/client";
import { ordersApi } from "./orders.api";

describe("ordersApi.getAll", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("includes searchText in the serialized filter", async () => {
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
});
