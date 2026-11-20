import {
  getApiErrorCode,
  getApiErrorDetails,
  getApiErrorStatus,
  getSafeApiErrorMessage
} from "@renderer/lib/apiError";
import type { PermissionAction, SeatIconConfig, SeatIconScope } from "@shared/types";
import axios from "axios";

export const SEAT_ICON_PERMISSION_KEY = "seat_icon_configs";

export const SCOPE_LABEL: Record<SeatIconScope, string> = {
  GLOBAL: "Toàn rạp",
  ROOM: "Phòng chiếu",
  FILM: "Phim"
};

export const SCOPE_TAG_COLOR: Record<SeatIconScope, string> = {
  GLOBAL: "geekblue",
  ROOM: "green",
  FILM: "purple"
};

/** Thứ tự hiển thị trong danh sách, cùng thứ tự backend trả về. */
export const SCOPE_ORDER: SeatIconScope[] = ["GLOBAL", "ROOM", "FILM"];

export interface SeatIconPermissions {
  /** Backend: đọc danh sách/chi tiết = `view` hoặc `list`. */
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

/** Quyền lấy từ assignment thật của key `seat_icon_configs`; thiếu key ⇒ không có quyền (fail-closed). */
export const resolveSeatIconPermissions = (
  can: (permissionKey: string, action: PermissionAction) => boolean
): SeatIconPermissions => ({
  canRead: can(SEAT_ICON_PERMISSION_KEY, "view") || can(SEAT_ICON_PERMISSION_KEY, "list"),
  canCreate: can(SEAT_ICON_PERMISSION_KEY, "create"),
  canUpdate: can(SEAT_ICON_PERMISSION_KEY, "update"),
  canDelete: can(SEAT_ICON_PERMISSION_KEY, "delete")
});

export const SEAT_ICON_ERROR_CODES = {
  duplicate: "SEAT_ICON_CONFIG_DUPLICATE",
  changed: "SEAT_ICON_CONFIG_CHANGED",
  notFound: "SEAT_ICON_CONFIG_NOT_FOUND"
} as const;

const NETWORK_ERROR_HINT = "Không kết nối được máy chủ, vui lòng kiểm tra mạng rồi thử lại.";
const NO_PERMISSION_MESSAGE = "Bạn không có quyền thực hiện thao tác này với cấu hình icon ghế";
const SESSION_EXPIRED_MESSAGE = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";

/**
 * Thông báo lỗi tiếng Việt cho API cấu hình icon ghế: mất mạng/timeout, 401, 403 và 5xx không mã nghiệp vụ
 * dùng câu cố định; lỗi có `code` (400/404/409/413/502/503) giữ thông báo của backend.
 */
export const getSeatIconErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error) && !error.response) {
    return `${fallback}. ${NETWORK_ERROR_HINT}`;
  }

  const status = getApiErrorStatus(error);
  if (status === 401) return SESSION_EXPIRED_MESSAGE;
  if (status === 403)
    return getApiErrorCode(error) ? getSafeApiErrorMessage(error, fallback) : NO_PERMISSION_MESSAGE;
  if (status === 422) return `Dữ liệu không hợp lệ: ${getSafeApiErrorMessage(error, fallback)}`;

  return getSafeApiErrorMessage(error, fallback);
};

export type SeatIconSaveError =
  | { kind: "duplicate"; existingId: number | null; message: string }
  | { kind: "changed"; current: SeatIconConfig | null; message: string }
  | { kind: "notFound"; message: string }
  | { kind: "other"; message: string };

const isConfigShape = (value: unknown): value is SeatIconConfig =>
  !!value &&
  typeof value === "object" &&
  typeof (value as SeatIconConfig).id === "number" &&
  typeof (value as SeatIconConfig).version === "number";

/** Phân loại lỗi khi tạo/sửa để form hiển thị đúng hướng xử lý (mở cấu hình đã có, tải bản mới nhất...). */
export const classifySeatIconSaveError = (error: unknown, fallback: string): SeatIconSaveError => {
  const code = getApiErrorCode(error);
  const details = getApiErrorDetails(error) as Record<string, unknown> | undefined;
  const message = getSeatIconErrorMessage(error, fallback);

  if (code === SEAT_ICON_ERROR_CODES.duplicate) {
    const existingId = Number(details?.existingId);
    return {
      kind: "duplicate",
      existingId: Number.isInteger(existingId) && existingId > 0 ? existingId : null,
      message
    };
  }
  if (code === SEAT_ICON_ERROR_CODES.changed) {
    return {
      kind: "changed",
      current: isConfigShape(details?.current) ? details.current : null,
      message
    };
  }
  if (code === SEAT_ICON_ERROR_CODES.notFound || getApiErrorStatus(error) === 404) {
    return { kind: "notFound", message };
  }
  return { kind: "other", message };
};

/** Tên hiển thị của phạm vi; phòng/phim đã xóa vẫn giữ id. */
export const getScopeTargetName = (
  config: Pick<SeatIconConfig, "scope" | "scopeId" | "scopeName">
) =>
  config.scope === "GLOBAL"
    ? "Toàn rạp"
    : (config.scopeName ?? `${SCOPE_LABEL[config.scope]} #${config.scopeId}`);

/** Sơ đồ ghế hiển thị gì sau khi tắt/xóa một cấu hình (cấu hình ưu tiên thấp hơn hoặc giao diện mặc định). */
export const describeFallback = (configs: SeatIconConfig[], removed: SeatIconConfig): string => {
  const global = configs.find(
    (config) => config.id !== removed.id && config.scope === "GLOBAL" && config.isEnabled
  );
  const globalText = global
    ? `cấu hình Toàn rạp (#${global.id})`
    : "giao diện mặc định (màu + mã ghế)";

  if (removed.scope === "FILM") {
    return `Suất chiếu phim "${getScopeTargetName(removed)}" sẽ dùng cấu hình của phòng chiếu nếu phòng có cấu hình riêng, nếu không thì ${globalText}.`;
  }
  if (removed.scope === "ROOM") {
    return `Phòng "${getScopeTargetName(removed)}" sẽ dùng ${globalText}; phim có cấu hình riêng vẫn giữ ảnh của phim.`;
  }
  return "Phòng và phim không có cấu hình riêng sẽ quay về giao diện mặc định (màu + mã ghế).";
};

/* ---------- Ảnh icon: kiểm tra định dạng/dung lượng trước khi upload (không giới hạn kích thước pixel) ---------- */

export const SEAT_ICON_MAX_SIZE = 1024 * 1024;
export const SEAT_ICON_ACCEPT = ".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp";

const ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "webp"];
const ALLOWED_MIME = /^image\/(png|jpeg|webp)$/;

export const formatBytes = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Lỗi định dạng/dung lượng kiểm tra được ngay (chưa cần đọc ảnh); `null` = hợp lệ. */
export const getSeatIconFileError = (file: Pick<File, "name" | "type" | "size">): string | null => {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.includes(extension) || !ALLOWED_MIME.test(file.type)) {
    return `Chỉ chấp nhận ảnh tĩnh PNG, JPG hoặc WebP (tệp ${file.name}).`;
  }
  if (file.size > SEAT_ICON_MAX_SIZE) {
    return `Ảnh icon ghế phải có dung lượng tối đa 1 MB (tệp ${formatBytes(file.size)}).`;
  }
  return null;
};

/** Tên file từ URL Cloudinary của ảnh đã lưu (form sửa không có metadata upload). */
export const getImageFileName = (url: string) => {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "") || url;
  } catch {
    return url;
  }
};
