import { ManufacturersQuery } from "@renderer/api/manufacturers.api";

export const manufacturersKeys = {
  all: ["manufacturers"] as const,
  getAll: (params: ManufacturersQuery) => ["manufacturers", params] as const
};
