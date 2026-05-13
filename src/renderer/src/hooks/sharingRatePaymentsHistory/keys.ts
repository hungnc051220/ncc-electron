import { SharingRatePaymentsHistoryQuery } from "@renderer/api/sharingRatePaymentsHistory.api";

export const sharingRatePaymentsHistoryKeys = {
  all: ["sharing-rate-payments-history"] as const,
  getAll: (params: SharingRatePaymentsHistoryQuery) =>
    ["sharing-rate-payments-history", params] as const
};
