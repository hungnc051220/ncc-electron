import type { PaperVoucherBatchQuery } from "@shared/types";

export const paperVoucherKeys = {
  all: ["paperVouchers"] as const,
  list: () => ["paperVouchers", "list"] as const,
  page: (query: PaperVoucherBatchQuery) => ["paperVouchers", "page", query] as const,
  summary: () => ["paperVouchers", "summary"] as const,
  detail: (id: number) => ["paperVouchers", "detail", id] as const,
  usages: (batchId: number) => ["paperVouchers", "usages", batchId] as const
};
