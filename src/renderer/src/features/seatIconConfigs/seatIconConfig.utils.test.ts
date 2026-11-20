import type { PermissionAction, SeatIconConfig } from "@shared/types";
import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import {
  classifySeatIconSaveError,
  describeFallback,
  getSeatIconErrorMessage,
  getSeatIconFileError,
  resolveSeatIconPermissions,
  SEAT_ICON_PERMISSION_KEY
} from "./seatIconConfig.utils";

const httpError = (status: number, data?: Record<string, unknown>) =>
  new AxiosError("Request failed", String(status), undefined, undefined, {
    status,
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
    data
  });

const networkError = () => new AxiosError("Network Error", "ERR_NETWORK");

const config = (overrides: Partial<SeatIconConfig>): SeatIconConfig => ({
  id: 1,
  targetType: "SOLD",
  scope: "GLOBAL",
  scopeId: null,
  scopeName: null,
  scopeTargetMissing: false,
  imageUrl: "https://res.anvui.vn/x.png",
  isEnabled: true,
  version: 1,
  createdAt: "2026-11-20T03:15:00.000Z",
  createdBy: "admin",
  updatedAt: null,
  updatedBy: null,
  ...overrides
});

describe("resolveSeatIconPermissions", () => {
  const canWith =
    (granted: PermissionAction[], key = SEAT_ICON_PERMISSION_KEY) =>
    (permissionKey: string, action: PermissionAction) =>
      permissionKey === key && granted.includes(action);

  it("reads with view OR list, like the backend", () => {
    expect(resolveSeatIconPermissions(canWith(["access", "list"])).canRead).toBe(true);
    expect(resolveSeatIconPermissions(canWith(["access", "view"])).canRead).toBe(true);
    expect(resolveSeatIconPermissions(canWith(["access"])).canRead).toBe(false);
  });

  it("maps create/update/delete separately and fails closed for other keys", () => {
    expect(resolveSeatIconPermissions(canWith(["create", "delete"]))).toEqual({
      canRead: false,
      canCreate: true,
      canUpdate: false,
      canDelete: true
    });
    expect(
      resolveSeatIconPermissions(canWith(["list", "create", "update", "delete"], "seat_types"))
    ).toEqual({ canRead: false, canCreate: false, canUpdate: false, canDelete: false });
  });
});

describe("getSeatIconErrorMessage", () => {
  it("handles network errors, 401, 403 and 422 with Vietnamese messages", () => {
    expect(getSeatIconErrorMessage(networkError(), "Không lưu được")).toBe(
      "Không lưu được. Không kết nối được máy chủ, vui lòng kiểm tra mạng rồi thử lại."
    );
    expect(getSeatIconErrorMessage(httpError(401, {}), "x")).toMatch(/Phiên đăng nhập/);
    expect(getSeatIconErrorMessage(httpError(403, {}), "x")).toBe(
      "Bạn không có quyền thực hiện thao tác này với cấu hình icon ghế"
    );
    expect(
      getSeatIconErrorMessage(
        httpError(422, { message: ["isEnabled must be a boolean value"] }),
        "x"
      )
    ).toBe("Dữ liệu không hợp lệ: isEnabled must be a boolean value");
  });

  it("keeps backend messages that carry a business code (503, 502) and hides raw 500s", () => {
    expect(
      getSeatIconErrorMessage(
        httpError(503, {
          code: "SEAT_ICON_CONFIG_UNAVAILABLE",
          message: "Chưa đọc được cấu hình icon ghế. Liên hệ quản trị viên."
        }),
        "x"
      )
    ).toBe("Chưa đọc được cấu hình icon ghế. Liên hệ quản trị viên.");
    expect(
      getSeatIconErrorMessage(httpError(500, { message: "SQL error near ..." }), "Không tải được")
    ).toMatch(/^Không tải được\. Máy chủ gặp lỗi/);
  });
});

describe("classifySeatIconSaveError", () => {
  it("detects duplicate with the existing id", () => {
    const result = classifySeatIconSaveError(
      httpError(409, {
        code: "SEAT_ICON_CONFIG_DUPLICATE",
        message: "Phạm vi này đã có cấu hình icon ghế.",
        details: { existingId: 9 }
      }),
      "x"
    );
    expect(result).toMatchObject({ kind: "duplicate", existingId: 9 });
  });

  it("detects version conflict and returns the current record", () => {
    const current = config({ id: 4, version: 6 });
    const result = classifySeatIconSaveError(
      httpError(409, {
        code: "SEAT_ICON_CONFIG_CHANGED",
        message: "Cấu hình đã được người khác thay đổi.",
        details: { current }
      }),
      "x"
    );
    expect(result).toEqual({
      kind: "changed",
      current,
      message: "Cấu hình đã được người khác thay đổi."
    });
  });

  it("detects not found and falls back to a plain message otherwise", () => {
    expect(
      classifySeatIconSaveError(
        httpError(404, { code: "SEAT_ICON_CONFIG_NOT_FOUND", message: "Không tìm thấy" }),
        "x"
      ).kind
    ).toBe("notFound");
    expect(
      classifySeatIconSaveError(
        httpError(400, { code: "SEAT_ICON_INVALID_IMAGE_URL", message: "URL ảnh không hợp lệ" }),
        "x"
      )
    ).toEqual({ kind: "other", message: "URL ảnh không hợp lệ" });
  });
});

describe("image checks before upload", () => {
  it("accepts static PNG/JPG/WebP up to 1 MB only", () => {
    expect(getSeatIconFileError({ name: "a.png", type: "image/png", size: 1024 })).toBeNull();
    expect(getSeatIconFileError({ name: "a.webp", type: "image/webp", size: 1024 })).toBeNull();
    expect(getSeatIconFileError({ name: "a.gif", type: "image/gif", size: 1024 })).toMatch(
      /PNG, JPG hoặc WebP/
    );
    expect(getSeatIconFileError({ name: "a.svg", type: "image/svg+xml", size: 10 })).not.toBeNull();
    expect(
      getSeatIconFileError({ name: "a.jpg", type: "image/jpeg", size: 1024 * 1024 + 1 })
    ).toMatch(/tối đa 1 MB/);
  });
});

describe("describeFallback", () => {
  const global = config({ id: 1 });
  const room = config({ id: 2, scope: "ROOM", scopeId: 3, scopeName: "Phòng 3" });
  const film = config({ id: 3, scope: "FILM", scopeId: 7, scopeName: "Phim A" });

  it("explains FILM > ROOM > GLOBAL > DEFAULT after removing a configuration", () => {
    expect(describeFallback([global, room, film], film)).toContain("cấu hình Toàn rạp (#1)");
    expect(describeFallback([global, room, film], room)).toContain('Phòng "Phòng 3"');
    expect(describeFallback([room, film], room)).toContain("giao diện mặc định");
    expect(describeFallback([global], global)).toContain("giao diện mặc định");
  });

  it("ignores a disabled GLOBAL configuration", () => {
    expect(describeFallback([config({ id: 1, isEnabled: false }), film], film)).toContain(
      "giao diện mặc định"
    );
  });
});
