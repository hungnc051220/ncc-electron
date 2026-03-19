import { SharingRatesQuery } from "@renderer/api/sharingRates.api";

export const sharingRatesKeys = {
  all: ["sharing-rates"] as const,
  getAll: (params: SharingRatesQuery) => ["sharing-rates", params] as const
};
