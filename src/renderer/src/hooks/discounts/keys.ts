import { DiscountsQuery } from "@renderer/api/discounts.api";

export const discountsKeys = {
  all: ["discounts"] as const,
  getAll: (params: DiscountsQuery) => ["discounts", params] as const
};
