import type { EffectiveSeatIconQuery, SeatIconConfigQuery } from "@shared/types";

export const seatIconConfigKeys = {
  all: ["seat-icon-configs"] as const,
  page: (query: SeatIconConfigQuery) => ["seat-icon-configs", "page", query] as const,
  list: () => ["seat-icon-configs", "list"] as const,
  detail: (id: number) => ["seat-icon-configs", "detail", id] as const,
  /** Cùng tiền tố `all`: lưu/xóa cấu hình làm mới luôn icon hiệu lực đang mở trong cửa sổ này. */
  effective: ({ filmId, roomId }: EffectiveSeatIconQuery) =>
    ["seat-icon-configs", "effective", filmId ?? null, roomId ?? null] as const
};
