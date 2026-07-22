import { fireEvent, render, screen } from "@testing-library/react";
import dayjs from "dayjs";
import { describe, expect, it, vi } from "vitest";
import {
  AppliedAccessHistoryFilters,
  getAccessHistoryActiveFilterCount,
  normalizeAccessHistoryFilterValues,
  serializeAccessHistoryDateRange
} from "./Filter";

describe("access history filter helpers", () => {
  it("normalizes meaningful values and keeps user id zero", () => {
    const values = normalizeAccessHistoryFilterValues({
      userId: 0,
      model: "  PlanScreenings ",
      dateRange: ["2026-07-15T17:00:00.000Z", "2026-07-16T16:59:59.999Z"]
    });

    expect(values).toEqual({
      userId: 0,
      model: "PlanScreenings",
      dateRange: ["2026-07-15T17:00:00.000Z", "2026-07-16T16:59:59.999Z"]
    });
    expect(getAccessHistoryActiveFilterCount(values)).toBe(3);
  });

  it("removes empty and invalid values from the active filter count", () => {
    const values = {
      userId: undefined,
      model: "   ",
      dateRange: ["invalid", "2026-07-16T16:59:59.999Z"] as [string, string]
    };

    expect(normalizeAccessHistoryFilterValues(values)).toEqual({});
    expect(getAccessHistoryActiveFilterCount(values)).toBe(0);
  });

  it("serializes selected calendar dates at Vietnam business-day boundaries", () => {
    expect(serializeAccessHistoryDateRange([dayjs("2026-07-16"), dayjs("2026-07-17")])).toEqual([
      "2026-07-15T17:00:00.000Z",
      "2026-07-17T16:59:59.999Z"
    ]);
  });
});

describe("AppliedAccessHistoryFilters", () => {
  const filterValues = {
    userId: 0,
    model: "PlanScreenings",
    dateRange: ["2026-07-15T17:00:00.000Z", "2026-07-16T16:59:59.999Z"] as [string, string]
  };

  it("renders business labels for every active filter", () => {
    render(
      <AppliedAccessHistoryFilters
        filterValues={filterValues}
        userOptions={[{ value: 0, label: "Admin" }]}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText("Loại dữ liệu: Lịch chiếu phim")).toBeInTheDocument();
    expect(screen.getByText("Người thực hiện: Admin")).toBeInTheDocument();
    expect(screen.getByText("Thời gian: 16/07/2026 – 16/07/2026")).toBeInTheDocument();
  });

  it("removes one filter without retaining undefined keys", () => {
    const onChange = vi.fn();

    render(
      <AppliedAccessHistoryFilters
        filterValues={filterValues}
        userOptions={[{ value: 0, label: "Admin" }]}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByLabelText("Xóa bộ lọc người thực hiện"));

    expect(onChange).toHaveBeenCalledWith({
      model: "PlanScreenings",
      dateRange: ["2026-07-15T17:00:00.000Z", "2026-07-16T16:59:59.999Z"]
    });
  });

  it("clears every active filter", () => {
    const onChange = vi.fn();

    render(<AppliedAccessHistoryFilters filterValues={filterValues} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Xóa tất cả" }));

    expect(onChange).toHaveBeenCalledWith({});
  });

  it("does not render a filter group for empty values", () => {
    render(
      <AppliedAccessHistoryFilters
        filterValues={{ model: "", userId: undefined }}
        onChange={vi.fn()}
      />
    );

    expect(screen.queryByRole("group", { name: "Bộ lọc đang áp dụng" })).not.toBeInTheDocument();
  });
});
