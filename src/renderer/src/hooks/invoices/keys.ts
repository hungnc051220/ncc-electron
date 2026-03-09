import { InvoicesQuery } from "@renderer/api/invoice.api";

export const invoicesKeys = {
  all: ["invoices"] as const,
  getAll: (params: InvoicesQuery) => ["invoices", params] as const,
  getDetail: (id: number) => ["invoice", id] as const
};
