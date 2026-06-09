import dayjs from "dayjs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getCurrentDayDateRange, isCurrentDayDateRange } from "./dateFilter";

describe("order history date filter", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("calculates the current day again after the application crosses midnight", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-09T23:59:00"));

    const previousDayRange = getCurrentDayDateRange();

    vi.setSystemTime(new Date("2026-06-10T00:01:00"));

    const currentDayRange = getCurrentDayDateRange();

    expect(dayjs(previousDayRange[0]).format("YYYY-MM-DD")).toBe("2026-06-09");
    expect(dayjs(currentDayRange[0]).format("YYYY-MM-DD")).toBe("2026-06-10");
    expect(isCurrentDayDateRange(previousDayRange)).toBe(false);
    expect(isCurrentDayDateRange(currentDayRange)).toBe(true);
  });
});
