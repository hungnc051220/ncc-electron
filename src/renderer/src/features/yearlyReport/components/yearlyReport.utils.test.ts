import { describe, expect, it } from "vitest";
import {
  QUARTERS,
  getQuarterDetail,
  normalizeYearlyDetailData,
  normalizeYearlySummaryData
} from "./yearlyReport.utils";

describe("yearlyReport.utils", () => {
  it("exposes all four quarters in order", () => {
    expect(QUARTERS).toEqual([1, 2, 3, 4]);
  });

  it("returns quarter detail when a quarter exists", () => {
    const quarters = {
      1: {
        screenings: 10,
        tickets: 200,
        revenue: 3000
      }
    };

    expect(getQuarterDetail(quarters, 1)).toEqual({
      screenings: 10,
      tickets: 200,
      revenue: 3000
    });
  });

  it("returns an empty object when quarter detail is missing", () => {
    expect(getQuarterDetail({}, 2)).toEqual({});
  });

  it("normalizes yearly detail data from a wrapped API response", () => {
    const response = {
      data: [
        {
          manufacturerId: 1,
          manufacturerName: "NCC",
          films: []
        }
      ]
    };

    expect(normalizeYearlyDetailData(response)).toEqual(response.data);
  });

  it("falls back to an empty detail list for invalid payloads", () => {
    expect(normalizeYearlyDetailData(null)).toEqual([]);
    expect(normalizeYearlyDetailData([])).toEqual([]);
    expect(normalizeYearlyDetailData({ data: {} })).toEqual([]);
  });

  it("normalizes yearly summary data from both supported response shapes", () => {
    const summaryItems = [
      {
        manufacturerId: 1,
        manufacturerName: "NCC",
        totalFilms: 4,
        totalPlans: 12,
        totalTicketsSold: 500,
        totalRevenue: 1000000,
        totalSharedRevenue: 250000
      }
    ];

    expect(normalizeYearlySummaryData(summaryItems)).toEqual(summaryItems);
    expect(normalizeYearlySummaryData({ data: summaryItems })).toEqual(summaryItems);
  });

  it("falls back to an empty summary list for unsupported payloads", () => {
    expect(normalizeYearlySummaryData(undefined)).toEqual([]);
    expect(normalizeYearlySummaryData({})).toEqual([]);
  });
});
