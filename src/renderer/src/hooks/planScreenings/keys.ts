import { PlanScreeningsQuery } from "@renderer/api/planScreenings.api";

export const planScreeningsKeys = {
  all: ["plan-screenings"] as const,
  allAvailableDates: ["plan-screenings-available-dates"] as const,
  getAvailableDates: (fromDate: string, toDate: string) =>
    [...planScreeningsKeys.allAvailableDates, fromDate, toDate] as const,
  getAll: (params: PlanScreeningsQuery) => ["plan-screenings", params] as const,
  getDetail: (id: number) => ["plan-screening", id] as const,
  getByDate: (date: string) => ["plan-screening-by-date", date] as const,
  /** Xem trước giá suất chiếu: tách tiền tố khỏi `plan-screenings` để không bị `removeQueries` xóa nhầm. */
  allRepricingPreview: ["plan-screening-repricing-preview"] as const,
  repricingPreview: (fromDate: string, toDate: string, includePast: boolean) =>
    ["plan-screening-repricing-preview", fromDate, toDate, includePast] as const
};
