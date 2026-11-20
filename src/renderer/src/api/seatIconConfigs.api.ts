import type {
  EffectiveSeatIcon,
  EffectiveSeatIconQuery,
  SeatIconConfig,
  SeatIconConfigDto,
  SeatIconConfigPage,
  SeatIconConfigQuery,
  SeatIconImageUpload,
  UpdateSeatIconConfigDto
} from "@shared/types";
import axios from "axios";
import { api } from "./client";

export const SEAT_ICON_CONFIGS_URL = "/api/pos/seat-icon-configs";

export const SEAT_ICON_IMAGE_TOO_LARGE_MESSAGE = "Ảnh icon ghế phải có dung lượng tối đa 1 MB";

/** Bỏ tham số rỗng để backend dùng mặc định (vd. `keyword=""` không lọc). */
const toListParams = (query: SeatIconConfigQuery) =>
  Object.fromEntries(
    Object.entries(query).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );

export const seatIconConfigsApi = {
  getPage: async (query: SeatIconConfigQuery): Promise<SeatIconConfigPage> => {
    const res = await api.get<SeatIconConfigPage>(SEAT_ICON_CONFIGS_URL, {
      params: toListParams(query)
    });
    return res.data;
  },
  /** Toàn bộ cấu hình (`pageSize=0`): biết phòng/phim nào đã có cấu hình để khóa lựa chọn trùng. */
  getAll: async (): Promise<SeatIconConfig[]> => {
    const res = await api.get<SeatIconConfigPage>(SEAT_ICON_CONFIGS_URL, {
      params: { pageSize: 0 }
    });
    return res.data.data;
  },
  getById: async (id: number): Promise<SeatIconConfig> => {
    const res = await api.get<SeatIconConfig>(`${SEAT_ICON_CONFIGS_URL}/${id}`);
    return res.data;
  },
  create: async (dto: SeatIconConfigDto): Promise<SeatIconConfig> => {
    const res = await api.post<SeatIconConfig>(SEAT_ICON_CONFIGS_URL, dto);
    return res.data;
  },
  update: async ({
    id,
    dto
  }: {
    id: number;
    dto: UpdateSeatIconConfigDto;
  }): Promise<SeatIconConfig> => {
    const res = await api.put<SeatIconConfig>(`${SEAT_ICON_CONFIGS_URL}/${id}`, dto);
    return res.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${SEAT_ICON_CONFIGS_URL}/${id}`);
  },
  uploadImage: async (file: File): Promise<SeatIconImageUpload> => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post<SeatIconImageUpload>(`${SEAT_ICON_CONFIGS_URL}/images`, formData);
      return res.data;
    } catch (error) {
      // Giới hạn multipart của backend trả 413 không kèm `code`/message tiếng Việt.
      if (axios.isAxiosError(error) && error.response?.status === 413) {
        throw new Error(SEAT_ICON_IMAGE_TOO_LARGE_MESSAGE);
      }
      throw error;
    }
  },
  /** Icon hiệu lực của một suất chiếu; backend tự chọn theo ưu tiên FILM > ROOM > GLOBAL > DEFAULT. */
  getEffective: async ({ filmId, roomId }: EffectiveSeatIconQuery): Promise<EffectiveSeatIcon> => {
    const res = await api.get<EffectiveSeatIcon>(`${SEAT_ICON_CONFIGS_URL}/effective`, {
      params: {
        targetType: "SOLD",
        ...(filmId ? { filmId } : {}),
        ...(roomId ? { roomId } : {})
      }
    });
    return res.data;
  }
};
