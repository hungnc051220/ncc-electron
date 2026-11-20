import { seatIconConfigsApi } from "@renderer/api/seatIconConfigs.api";
import type { EffectiveSeatIconQuery } from "@shared/types";
import { useQuery } from "@tanstack/react-query";
import { seatIconConfigKeys } from "./keys";

/**
 * Icon ghế đã bán hiệu lực của suất chiếu đang mở (backend chọn FILM > ROOM > GLOBAL > DEFAULT).
 *
 * - Một request cho cả sơ đồ, không gọi theo từng ghế.
 * - Luôn đọc lại khi mở suất (`refetchOnMount: "always"`) và không giữ cache sau khi rời màn hình
 *   (`gcTime: 0`, như chi tiết suất chiếu) để mọi máy POS thấy cấu hình mới nhất của backend.
 * - Khóa gồm `filmId` + `roomId`, không dùng `placeholderData`: chuyển suất không hiển thị tạm icon cũ.
 * - Lỗi mạng/5xx/timeout không thử lại và trả `imageUrl = null` ⇒ sơ đồ giữ giao diện mặc định.
 */
export const useEffectiveSeatIcon = (
  { filmId, roomId }: EffectiveSeatIconQuery,
  enabled = true
) => {
  const query = useQuery({
    queryKey: seatIconConfigKeys.effective({ filmId, roomId }),
    queryFn: () => seatIconConfigsApi.getEffective({ filmId, roomId }),
    enabled: enabled && (!!filmId || !!roomId),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    retry: 0
  });

  const imageUrl = query.data?.hasIcon && query.data.imageUrl ? query.data.imageUrl : null;

  return { ...query, imageUrl };
};
