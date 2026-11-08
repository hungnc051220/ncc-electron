import { api } from "@renderer/api/client";
import type { U22PriceConfig, UpdateU22PriceConfigDto } from "@shared/types";

/** Mã lỗi backend của cấu hình giá U22 (`response.data.code`). */
export const U22_PRICE_CONFIG_UNAVAILABLE = "U22_PRICE_CONFIG_UNAVAILABLE";
export const U22_PRICE_CONFIG_CHANGED = "U22_PRICE_CONFIG_CHANGED";
export const U22_INVALID_PRICE_CONFIG = "U22_INVALID_PRICE_CONFIG";
export const STAFF_PERMISSION_DENIED = "STAFF_PERMISSION_DENIED";

/** Mã lỗi khi bán vé U22 (tạo đơn / báo giá voucher giấy). */
export const U22_PRICE_CHANGED = "U22_PRICE_CHANGED";
export const U22_PRICE_CONFIRMATION_REQUIRED = "U22_PRICE_CONFIRMATION_REQUIRED";
export const U22_SHOW_DATE_NOT_CONFIGURED = "U22_SHOW_DATE_NOT_CONFIGURED";

export const u22PriceConfigApi = {
  get: async (): Promise<U22PriceConfig> => {
    const res = await api.get("/api/pos/u22-price-config");
    return res.data;
  },
  update: async (dto: UpdateU22PriceConfigDto): Promise<U22PriceConfig> => {
    const res = await api.put("/api/pos/u22-price-config", dto);
    return res.data;
  }
};
