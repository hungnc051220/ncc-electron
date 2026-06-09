import dayjs from "dayjs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { rangePresets } from "./dateRangePresets";

describe("date range presets", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("evaluates the today preset when it is selected", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T00:01:00"));

    const todayPreset = rangePresets?.[0];
    const [startDate, endDate] =
      typeof todayPreset!.value === "function" ? todayPreset!.value() : todayPreset!.value;

    expect(dayjs(startDate).format("YYYY-MM-DD HH:mm:ss")).toBe("2026-06-10 00:00:00");
    expect(dayjs(endDate).format("YYYY-MM-DD HH:mm:ss")).toBe("2026-06-10 23:59:59");
  });
});
