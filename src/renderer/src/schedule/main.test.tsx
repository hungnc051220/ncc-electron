import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ScheduleDisplayMovie, ScheduleDisplayPayload } from "@shared/types";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { getScheduleLayout } from "./layout";
import {
  formatScheduleWeekday,
  getServerOffset,
  getServerTime,
  isScheduleSessionPast
} from "./time";

const movie: ScheduleDisplayMovie = {
  id: 1,
  title: "Phim thử nghiệm có tên rất dài để kiểm tra giới hạn hai dòng",
  posterUrl: "https://example.com/poster.jpg",
  durationMinutes: 120,
  version: "2D",
  language: "PDV",
  ageRating: "C16",
  free: false,
  sessions: [
    { id: 10, time: "09:59", startAt: "2026-09-10T09:59:00+07:00" },
    { id: 11, time: "10:01", startAt: "2026-09-10T10:01:00+07:00" }
  ]
};

const payload: ScheduleDisplayPayload = {
  date: "2026-09-10",
  timezone: "Asia/Ho_Chi_Minh",
  serverNow: "2026-09-10T10:00:00+07:00",
  fetchedAt: "2026-09-10T10:00:00+07:00",
  lastSuccessAt: "2026-09-10T10:00:00+07:00",
  stale: false,
  movies: [movie]
};

const setViewport = (width: number, height: number, dpr = 1) => {
  Object.defineProperties(window, {
    innerWidth: { configurable: true, value: width },
    innerHeight: { configurable: true, value: height },
    devicePixelRatio: { configurable: true, value: dpr }
  });
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  setViewport(1024, 768);
});

describe("ScheduleDisplayApp", () => {
  it("uses POS time when the Android clock is wrong and falls back when a poster fails", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2035-01-01T00:00:00.000Z"));
    setViewport(1080, 1920, 2);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(payload)));
    render(<App />);

    await act(async () => Promise.resolve());
    expect(screen.getByText(movie.title)).toBeInTheDocument();
    expect(screen.getByText("10/09/2026")).toBeInTheDocument();
    expect(screen.getByText("Thứ Năm")).toBeInTheDocument();
    expect(screen.getByText(/16 tuổi trở lên/)).toBeInTheDocument();
    expect(screen.getByText("120 phút")).toBeInTheDocument();
    expect(screen.getByText("09:59").closest("time")).toHaveClass("session-past");
    expect(screen.getByText("10:01").closest("time")).not.toHaveClass("session-past");
    expect(document.querySelector(".schedule-screen")).toHaveAttribute(
      "data-orientation",
      "portrait"
    );
    fireEvent.error(screen.getByRole("img", { name: `Poster ${movie.title}` }));
    expect(screen.getByLabelText("Không có poster")).toBeInTheDocument();
  });

  it("marks a session as past from the running server clock without reloading", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2035-01-01T00:00:00.000Z"));
    const nextSession = {
      ...movie,
      sessions: [{ id: 12, time: "10:00", startAt: "2026-09-10T10:00:01+07:00" }]
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ ...payload, movies: [nextSession] }))
    );
    render(<App />);

    await act(async () => Promise.resolve());
    expect(screen.getByText("10:00").closest("time")).not.toHaveClass("session-past");
    await act(async () => vi.advanceTimersByTimeAsync(2_000));
    expect(screen.getByText("10:00").closest("time")).toHaveClass("session-past");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("shows loading, empty, stale and initial error states", async () => {
    let resolveFetch: ((response: Response) => void) | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve;
          })
      )
    );
    const loadingView = render(<App />);
    expect(screen.getByTestId("schedule-loading")).toBeInTheDocument();
    await act(async () => resolveFetch?.(Response.json({ ...payload, movies: [] })));
    expect(await screen.findByText("Hôm nay chưa có lịch chiếu")).toBeInTheDocument();
    loadingView.unmount();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ...payload, stale: true })));
    const staleView = render(<App />);
    expect(await screen.findByText(/Dữ liệu lúc/)).toBeInTheDocument();
    staleView.unmount();

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ message: "Chưa cấu hình khóa API cho màn hình TV" }, { status: 503 })
        )
    );
    render(<App />);
    expect(await screen.findByText("Không thể tải lịch chiếu")).toBeInTheDocument();
    expect(screen.getByText("Chưa cấu hình khóa API cho màn hình TV")).toBeInTheDocument();
  });

  it("refreshes every minute and responds to an orientation change", async () => {
    vi.useFakeTimers();
    setViewport(1080, 1920);
    const fetchMock = vi.fn().mockResolvedValue(Response.json(payload));
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);

    await act(async () => Promise.resolve());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    setViewport(1920, 1080);
    fireEvent(window, new Event("resize"));
    expect(document.querySelector(".schedule-screen")).toHaveAttribute(
      "data-orientation",
      "landscape"
    );
    await act(async () => vi.advanceTimersByTimeAsync(60_000));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("schedule display layout and time helpers", () => {
  it("formats the weekday in the schedule timezone across UTC midnight", () => {
    expect(formatScheduleWeekday(new Date("2026-09-09T18:00:00Z"))).toBe("Thứ Năm");
  });

  it.each([
    [1, 2, 1, "full"],
    [6, 2, 3, "full"],
    [12, 2, 6, "full"],
    [16, 2, 8, "compact"],
    [17, 2, 8, "compact"],
    [18, 2, 8, "compact"],
    [24, 2, 8, "compact"],
    [30, 2, 8, "compact"]
  ] as const)("lays out %i movies in portrait", (count, columns, rows, density) => {
    expect(getScheduleLayout(count, { width: 1080, height: 1920, devicePixelRatio: 2 })).toEqual({
      columns,
      rows,
      density,
      orientation: "portrait"
    });
  });

  it("supports 4K portrait and landscape CSS viewports", () => {
    expect(getScheduleLayout(17, { width: 2160, height: 3840, devicePixelRatio: 1 })).toMatchObject(
      {
        columns: 2,
        rows: 8,
        orientation: "portrait"
      }
    );
    expect(getScheduleLayout(17, { width: 3840, height: 2160, devicePixelRatio: 1 })).toMatchObject(
      {
        columns: 2,
        rows: 8,
        orientation: "landscape"
      }
    );
  });

  it("derives the current time from the POS even when the client clock is wrong", () => {
    const wrongClientNow = new Date("2035-01-01T00:00:00Z").getTime();
    const offset = getServerOffset("2026-09-10T10:00:00+07:00", wrongClientNow);
    const currentTime = getServerTime(offset, wrongClientNow + 2_000);

    expect(currentTime.toISOString()).toBe("2026-09-10T03:00:02.000Z");
    expect(isScheduleSessionPast("2026-09-10T10:00:01+07:00", currentTime)).toBe(true);
  });
});
