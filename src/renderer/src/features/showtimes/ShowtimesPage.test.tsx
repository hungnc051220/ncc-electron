import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import dayjs from "dayjs";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ShowtimesPage from "./ShowtimesPage";

const mocks = vi.hoisted(() => ({
  setDate: vi.fn()
}));

vi.mock("antd", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  Checkbox: ({
    children,
    checked,
    onChange
  }: {
    children?: React.ReactNode;
    checked?: boolean;
    onChange?: (event: { target: { checked: boolean } }) => void;
  }) => (
    <label>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange?.({ target: { checked: event.target.checked } })}
      />
      {children}
    </label>
  ),
  DatePicker: () => <div data-testid="date-picker" />,
  Table: () => <div data-testid="showtimes-table" />
}));

vi.mock("nuqs", () => ({
  useQueryState: vi.fn()
}));

vi.mock("@renderer/hooks/planScreenings/usePlanScreeningsByDate", () => ({
  usePlanScreeningsByDate: () => ({
    data: [],
    isFetching: false
  })
}));

vi.mock("@renderer/hooks/planScreenings/usePlanScreeningsAvailableDates", () => ({
  usePlanScreeningsAvailableDates: () => ({
    data: []
  })
}));

vi.mock("@renderer/hooks/useRealtimeClock", () => ({
  useRealtimeClock: () => 0
}));

import { useQueryState } from "nuqs";

const mockedUseQueryState = vi.mocked(useQueryState);

describe("ShowtimesPage", () => {
  beforeEach(() => {
    mocks.setDate.mockReset();
  });

  it("resets the selected date to today when opening showtimes with the reset flag", async () => {
    mockedUseQueryState.mockReturnValue(["2026-04-08", mocks.setDate]);

    render(
      <MemoryRouter initialEntries={["/showtimes?resetDate=1"]}>
        <Routes>
          <Route path="/showtimes" element={<ShowtimesPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mocks.setDate).toHaveBeenCalledWith(dayjs().format("YYYY-MM-DD"));
    });
  });

  it("keeps the current filter when the reset flag is absent", async () => {
    mockedUseQueryState.mockReturnValue(["2026-04-09", mocks.setDate]);

    render(
      <MemoryRouter initialEntries={["/showtimes?date=2026-04-09"]}>
        <Routes>
          <Route path="/showtimes" element={<ShowtimesPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mocks.setDate).not.toHaveBeenCalled();
    });
  });
});
