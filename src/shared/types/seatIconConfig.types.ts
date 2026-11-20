/**
 * Cấu hình icon ghế (Backend V1, `docs/agents/seat-icon-config-v1.md` của `ncc-online-be-nestjs`).
 * Prefix API: `/api/pos/seat-icon-configs`.
 */

/** V1 chỉ có ghế đã bán thông thường; backend có thể thêm loại khác ở giai đoạn sau. */
export type SeatIconTargetType = "SOLD";

/** Ưu tiên hiển thị: FILM > ROOM > GLOBAL > giao diện mặc định. */
export type SeatIconScope = "GLOBAL" | "ROOM" | "FILM";

export interface SeatIconConfig {
  id: number;
  targetType: SeatIconTargetType;
  scope: SeatIconScope;
  /** `null` với GLOBAL; `Room.Id` / `Film.Id` với ROOM / FILM. */
  scopeId: number | null;
  scopeName: string | null;
  /** Phòng/phim đã bị xóa mềm hoặc không còn (cấu hình vẫn áp dụng theo id). */
  scopeTargetMissing: boolean;
  imageUrl: string;
  isEnabled: boolean;
  version: number;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface SeatIconConfigQuery {
  targetType?: SeatIconTargetType;
  scope?: SeatIconScope;
  isEnabled?: boolean;
  keyword?: string;
  current?: number;
  /** `0` = tất cả (tối đa 500). */
  pageSize?: number;
}

export interface SeatIconConfigPage {
  data: SeatIconConfig[];
  total: number;
  current: number;
  pageSize: number;
  pageCount: number;
}

export interface SeatIconConfigDto {
  targetType: SeatIconTargetType;
  scope: SeatIconScope;
  scopeId: number | null;
  imageUrl: string;
  isEnabled: boolean;
}

/** `PUT /:id` thay toàn bộ, bắt buộc `version` của bản đã đọc. */
export interface UpdateSeatIconConfigDto extends SeatIconConfigDto {
  version: number;
}

/** Kết quả `POST /images`: ảnh đã được backend kiểm tra từ nội dung file. */
export interface SeatIconImageUpload {
  url: string;
  fileName: string | null;
  mimeType: string;
  width: number;
  height: number;
  size: number;
  isSquare: boolean;
}

export interface EffectiveSeatIconQuery {
  filmId?: number | null;
  roomId?: number | null;
}

/** `GET /effective`: backend đã chọn cấu hình theo ưu tiên FILM > ROOM > GLOBAL > DEFAULT. */
export interface EffectiveSeatIcon {
  targetType: SeatIconTargetType;
  source: SeatIconScope | "DEFAULT";
  hasIcon: boolean;
  configId: number | null;
  scope: SeatIconScope | null;
  scopeId: number | null;
  imageUrl: string | null;
  version: number | null;
  updatedAt: string | null;
}
