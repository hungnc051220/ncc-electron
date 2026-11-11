import { api } from "@renderer/api/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { auditLogApi } from "./auditLog.api";

describe("auditLogApi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("includes userId 0 in the existing audit filter", async () => {
    const getSpy = vi.spyOn(api, "get").mockResolvedValue({
      data: {
        data: [],
        pageCount: 0,
        totalCount: 0
      }
    });

    await auditLogApi.getAll({
      current: 1,
      pageSize: 20,
      userId: 0
    });

    const requestedUrl = getSpy.mock.calls[0][0];
    const query = new URL(requestedUrl, "https://ncc.local").searchParams;

    expect(requestedUrl).toContain("/pos/audit-log?");
    expect(JSON.parse(query.get("filter") ?? "{}")).toEqual({ userId: 0 });
    expect(query.get("current")).toBe("1");
    expect(query.get("pageSize")).toBe("20");
    expect(query.get("sort")).toBe("timestamp.desc");
  });
});
