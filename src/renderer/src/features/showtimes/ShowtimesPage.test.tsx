import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import dayjs from "dayjs";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ShowtimesPage from "./ShowtimesPage";

const mocks = vi.hoisted(() => ({
  setDate: vi.fn(),
  screeningsData: [] as Array<{
    filmName: string;
    details: Array<{
      planCinemaId: number;
      planScreeningsId: number;
      projectTime: string;
      roomId: string;
      roomName: string;
    }>;
  }>
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
    disabled,
    onChange
  }: {
    children?: React.ReactNode;
    checked?: boolean;
    disabled?: boolean;
    onChange?: (event: { target: { checked: boolean } }) => void;
  }) => (
    <label>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.({ target: { checked: event.target.checked } })}
      />
      {children}
    </label>
  ),
  DatePicker: () => <div data-testid="date-picker" />,
  Table: ({
    dataSource,
    columns
  }: {
    dataSource?: Array<{ filmName: string; details: Array<{ projectTime: string }> }>;
    columns?: Array<{
      dataIndex?: string;
      render?: (value: unknown, record: Record<string, unknown>, index: number) => React.ReactNode;
    }>;
  }) => (
    <div data-testid="showtimes-table">
      {dataSource?.map((film, index) => (
        <div key={film.filmName}>
          {columns?.map((column, columnIndex) => {
            const value = column.dataIndex ? (film as Record<string, unknown>)[column.dataIndex] : undefined;

            return (
              <div key={`${film.filmName}-${columnIndex}`}>
                {column.render
                  ? column.render(value, film as Record<string, unknown>, index)
                  : (value as React.ReactNode)}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  )
}));

vi.mock("nuqs", () => ({
  useQueryState: vi.fn()
}));

vi.mock("@renderer/hooks/planScreenings/usePlanScreeningsByDate", () => ({
  usePlanScreeningsByDate: () => ({
    data: mocks.screeningsData,
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
    mocks.screeningsData = [];
    sessionStorage.clear();
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

  it("disables showing past schedules in swap seats flow", async () => {
    mockedUseQueryState.mockReturnValue([dayjs().format("YYYY-MM-DD"), mocks.setDate]);

    render(
      <MemoryRouter initialEntries={["/showtimes?callbackUrl=/order-history/swap-seats&id=1"]}>
        <Routes>
          <Route path="/showtimes" element={<ShowtimesPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByLabelText("Hiển thị lịch đã chiếu")).toBeDisabled();
  });

  it("hides screenings that have already passed on the selected day", async () => {
    vi.setSystemTime(new Date("2026-04-14T11:46:00+07:00"));
    mockedUseQueryState.mockReturnValue(["2026-04-14", mocks.setDate]);
    mocks.screeningsData = [
      {
        filmName: "THỎ ƠI-T18",
        details: [
          {
            planCinemaId: 12081,
            planScreeningsId: 400561,
            projectTime: "2026-04-14T05:00:00+07:00",
            roomId: "86",
            roomName: "1"
          }
        ]
      },
      {
        filmName: "PHIM SUPER MARIO THIÊN HÀ - P (PHỤ ĐỀ)",
        details: [
          {
            planCinemaId: 12082,
            planScreeningsId: 400562,
            projectTime: "2026-04-14T20:00:00+07:00",
            roomId: "87",
            roomName: "2"
          }
        ]
      }
    ];

    render(
      <MemoryRouter initialEntries={["/showtimes?date=2026-04-14"]}>
        <Routes>
          <Route path="/showtimes" element={<ShowtimesPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText("THỎ ƠI-T18")).not.toBeInTheDocument();
    expect(screen.queryByText("05:00")).not.toBeInTheDocument();
    expect(screen.getByText("PHIM SUPER MARIO THIÊN HÀ - P (PHỤ ĐỀ)")).toBeInTheDocument();
    expect(screen.getByText("20:00")).toBeInTheDocument();
  });

  it("keeps the last selected showtime button highlighted when returning to the page", async () => {
    mockedUseQueryState.mockReturnValue(["2026-04-14", mocks.setDate]);
    mocks.screeningsData = [
      {
        filmName: "Movie A",
        details: [
          {
            planCinemaId: 1,
            planScreeningsId: 400562,
            projectTime: "2026-04-14T20:00:00+07:00",
            roomId: "87",
            roomName: "2"
          }
        ]
      }
    ];

    render(
      <MemoryRouter initialEntries={["/showtimes?date=2026-04-14"]}>
        <Routes>
          <Route path="/showtimes" element={<ShowtimesPage />} />
        </Routes>
      </MemoryRouter>
    );

    const showtimeButton = screen.getByRole("button", { name: "20:00" });
    fireEvent.click(showtimeButton);

    expect(sessionStorage.getItem("showtimes:last-selected-plan-screening-id")).toBe("400562");
    expect(sessionStorage.getItem("showtimes:last-selected-date")).toBe("2026-04-14");
    expect(showtimeButton).toHaveAttribute("aria-pressed", "true");
    expect(showtimeButton.className).toContain("border-primary");
  });
});
