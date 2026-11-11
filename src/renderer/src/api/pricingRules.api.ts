import { api } from "@renderer/api/client";
import { getApiErrorStatus } from "@renderer/lib/apiError";
import type { PricingRules } from "@shared/types";

const toBoolean = (value: unknown) => value === true;

const toStringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

/**
 * Chuẩn hóa body `GET /api/pos/pricing/rules` (contract V3.2 mục 2): trường thiếu hoặc sai kiểu được hiểu là
 * "chưa có", để FE không bao giờ hiển thị một khả năng mà backend chưa xác nhận. `ready` chỉ đúng khi backend
 * báo `ready` và đủ cả ba cấu trúc.
 */
export const normalizePricingRules = (raw: unknown): PricingRules => {
  const body = (raw ?? {}) as Record<string, unknown>;
  const schemaBody = (body.schema ?? {}) as Record<string, unknown>;
  const schema = {
    holidayPriceMode: toBoolean(schemaBody.holidayPriceMode),
    promotionExclusion: toBoolean(schemaBody.promotionExclusion),
    screeningPolicy: toBoolean(schemaBody.screeningPolicy)
  };
  return {
    ruleVersion: typeof body.ruleVersion === "string" ? body.ruleVersion : "",
    schema,
    ready:
      toBoolean(body.ready) &&
      schema.holidayPriceMode &&
      schema.promotionExclusion &&
      schema.screeningPolicy,
    enforcedPolicies: toStringList(body.enforcedPolicies)
  };
};

/** Lỗi tương thích hiển thị khi backend V3.2 chạy trên DB chưa có đủ cấu trúc (`ready = false`). */
export const PRICING_SCHEMA_NOT_READY_MESSAGE =
  "Cơ sở dữ liệu chưa được cập nhật cấu trúc V3.2. Liên hệ quản trị hệ thống.";

export const pricingRulesApi = {
  /** Năng lực của backend; `null` khi backend cũ chưa có endpoint (404). */
  get: async (): Promise<PricingRules | null> => {
    try {
      const res = await api.get("/api/pos/pricing/rules");
      return normalizePricingRules(res.data);
    } catch (error) {
      if (getApiErrorStatus(error) === 404) return null;
      throw error;
    }
  }
};
