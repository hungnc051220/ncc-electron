import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import dayjs from "dayjs";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ShowtimesPage from "./ShowtimesPage";
import type { Mock } from "vitest";

const mocks = vi.hoisted(() => ({
  setDate: vi.fn(),
  setShowPast: vi.fn(),
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
            const value = column.dataIndex
              ? (film as Record<string, unknown>)[column.dataIndex]
              : undefined;

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
  parseAsBoolean: {
    withDefault: vi.fn((defaultValue: boolean) => ({ defaultValue, type: "boolean" }))
  },
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

const mockShowtimesQueryState = (date: string, showPast = false) => {
  (mockedUseQueryState as unknown as Mock).mockImplementation((key: string) => {
    if (key === "showPast") {
      return [showPast, mocks.setShowPast];
    }

    return [date, mocks.setDate];
  });
};

describe("ShowtimesPage", () => {
  beforeEach(() => {
    mocks.setDate.mockReset();
    mocks.setShowPast.mockReset();
    mocks.screeningsData = [];
    sessionStorage.clear();
    mockedUseQueryState.mockReset();
  });

  it("resets the selected date to today when opening showtimes with the reset flag", async () => {
    mockShowtimesQueryState("2026-04-08");

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
    mockShowtimesQueryState("2026-04-09");

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
    mockShowtimesQueryState(dayjs().format("YYYY-MM-DD"));

    render(
      <MemoryRouter initialEntries={["/showtimes?callbackUrl=/order-history/swap-seats&id=1"]}>
        <Routes>
          <Route path="/showtimes" element={<ShowtimesPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByLabelText("Hiển thị lịch đã chiếu")).toBeDisabled();
  });

  it("saves the show past schedules checkbox to query state", async () => {
    mockShowtimesQueryState("2026-04-14");

    render(
      <MemoryRouter initialEntries={["/showtimes?date=2026-04-14"]}>
        <Routes>
          <Route path="/showtimes" element={<ShowtimesPage />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByLabelText("Hiển thị lịch đã chiếu"));

    expect(mocks.setShowPast).toHaveBeenCalledWith(true);
  });

  it("clears show past schedules query state in swap seats flow", async () => {
    mockShowtimesQueryState(dayjs().format("YYYY-MM-DD"), true);

    render(
      <MemoryRouter
        initialEntries={["/showtimes?callbackUrl=/order-history/swap-seats&id=1&showPast=true"]}
      >
        <Routes>
          <Route path="/showtimes" element={<ShowtimesPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mocks.setShowPast).toHaveBeenCalledWith(false);
    });
  });

  it("hides screenings that have already passed on the selected day", async () => {
    vi.setSystemTime(new Date("2026-04-14T11:46:00+07:00"));
    mockShowtimesQueryState("2026-04-14");
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
    mockShowtimesQueryState("2026-04-14");
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

    sessionStorage.setItem("showtimes:restore-last-selected", "1");
    sessionStorage.setItem("showtimes:last-selected-plan-screening-id", "400562");
    sessionStorage.setItem("showtimes:last-selected-date", "2026-04-14");

    render(
      <MemoryRouter initialEntries={["/showtimes?date=2026-04-14"]}>
        <Routes>
          <Route path="/showtimes" element={<ShowtimesPage />} />
        </Routes>
      </MemoryRouter>
    );

    const showtimeButton = screen.getByRole("button", { name: "20:00" });
    expect(showtimeButton).toHaveAttribute("aria-pressed", "true");
    expect(showtimeButton.className).toContain("bg-primary");
    expect(sessionStorage.getItem("showtimes:restore-last-selected")).toBeNull();
  });

  it("clears the last selected showtime when reopening from another flow", async () => {
    mockShowtimesQueryState("2026-04-14");
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

    sessionStorage.setItem("showtimes:last-selected-plan-screening-id", "400562");
    sessionStorage.setItem("showtimes:last-selected-date", "2026-04-14");

    render(
      <MemoryRouter initialEntries={["/showtimes?date=2026-04-14"]}>
        <Routes>
          <Route path="/showtimes" element={<ShowtimesPage />} />
        </Routes>
      </MemoryRouter>
    );

    const showtimeButton = screen.getByRole("button", { name: "20:00" });
    expect(showtimeButton).toHaveAttribute("aria-pressed", "false");
    expect(showtimeButton.className).not.toContain("bg-primary");
    expect(sessionStorage.getItem("showtimes:last-selected-plan-screening-id")).toBeNull();
    expect(sessionStorage.getItem("showtimes:last-selected-date")).toBeNull();
  });
});
