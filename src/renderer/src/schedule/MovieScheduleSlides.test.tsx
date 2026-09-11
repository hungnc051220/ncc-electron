import { act, render, screen, within } from "@testing-library/react";
import type { ScheduleDisplayMovie } from "@shared/types";
import { afterEach, describe, expect, it, vi } from "vitest";
import MovieScheduleSlides from "./MovieScheduleSlides";
import MovieScheduleRow from "./MovieScheduleRow";

const serverTime = new Date("2026-09-10T10:00:00+07:00");
const movies = (count: number): ScheduleDisplayMovie[] =>
  Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    title: `Phim ${index + 1}`,
    posterUrl: null,
    durationMinutes: 120,
    version: "2D",
    language: "TV",
    ageRating: "P",
    free: false,
    sessions: [{ id: index, time: "18:00", startAt: "2026-09-10T18:00:00+07:00" }]
  }));

afterEach(() => vi.useRealTimers());

describe("schedule movie slides", () => {
  it("splits 33 films in order, advances every 15 seconds and loops forward to page one", () => {
    vi.useFakeTimers();
    render(<MovieScheduleSlides movies={movies(33)} serverTime={serverTime} />);
    const pageOne = screen.getByRole("group", { name: "Trang lịch chiếu 1/3" });
    expect(within(pageOne).getAllByRole("article")).toHaveLength(16);
    expect(within(pageOne).getByText("Phim 1")).toBeInTheDocument();
    expect(within(pageOne).getByText("Phim 16")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(14_999));
    expect(pageOne).toHaveAttribute("aria-hidden", "false");
    act(() => vi.advanceTimersByTime(1));
    const pageTwo = screen.getByRole("group", { name: "Trang lịch chiếu 2/3" });
    expect(within(pageTwo).getByText("Phim 17")).toBeInTheDocument();
    expect(within(pageTwo).getByText("Phim 32")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(15_000));
    const pageThree = screen.getByRole("group", { name: "Trang lịch chiếu 3/3" });
    expect(within(pageThree).getAllByRole("article")).toHaveLength(1);
    expect(within(pageThree).getByText("Phim 33")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(15_000));
    expect(screen.getByRole("group", { name: "Trang lịch chiếu 1/3" })).not.toBe(pageOne);
    act(() => vi.advanceTimersByTime(600));
    expect(screen.getByRole("group", { name: "Trang lịch chiếu 1/3" })).toBe(pageOne);
    act(() => vi.advanceTimersByTime(14_400));
    expect(screen.getByRole("group", { name: "Trang lịch chiếu 2/3" })).toBe(pageTwo);
  });

  it.each([1, 16])("does not start a slideshow timer for %i films", (count) => {
    vi.useFakeTimers();
    const baseline = vi.getTimerCount();
    render(<MovieScheduleSlides movies={movies(count)} serverTime={serverTime} />);
    expect(vi.getTimerCount()).toBe(baseline);
    act(() => vi.advanceTimersByTime(45_000));
    expect(screen.getByRole("group", { name: "Trang lịch chiếu 1/1" })).toBeInTheDocument();
  });

  it("retains the current page on refresh, resets safely when page count shrinks and cleans timers", () => {
    vi.useFakeTimers();
    const baseline = vi.getTimerCount();
    const view = render(<MovieScheduleSlides movies={movies(33)} serverTime={serverTime} />);
    act(() => vi.advanceTimersByTime(30_000));
    view.rerender(<MovieScheduleSlides movies={movies(34)} serverTime={serverTime} />);
    expect(screen.getByRole("group", { name: "Trang lịch chiếu 3/3" })).toBeInTheDocument();
    view.rerender(<MovieScheduleSlides movies={movies(17)} serverTime={serverTime} />);
    expect(screen.getByRole("group", { name: "Trang lịch chiếu 1/2" })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(30_000));
    view.unmount();
    expect(vi.getTimerCount()).toBe(baseline);
  });

  it("stops paging when a refreshed schedule drops to sixteen films", () => {
    vi.useFakeTimers();
    const baseline = vi.getTimerCount();
    const view = render(<MovieScheduleSlides movies={movies(17)} serverTime={serverTime} />);
    act(() => vi.advanceTimersByTime(15_000));
    view.rerender(<MovieScheduleSlides movies={movies(16)} serverTime={serverTime} />);
    expect(screen.getByRole("group", { name: "Trang lịch chiếu 1/1" })).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(baseline);
  });
});

describe("schedule metadata", () => {
  it("renders genre, country and duration as plain text without icons", () => {
    const movie = { ...movies(1)[0], genre: "Tâm lý, tình cảm", country: "Việt Nam" };
    const view = render(<MovieScheduleRow movie={movie} serverTime={serverTime} />);
    expect(screen.getByText("Tâm lý, tình cảm | Việt Nam | 120 phút")).toBeInTheDocument();
    expect(view.container.querySelector(".movie-details svg")).toBeNull();
  });

  it("omits missing metadata without inventing a genre or country", () => {
    render(<MovieScheduleRow movie={movies(1)[0]} serverTime={serverTime} />);
    expect(screen.getByText("120 phút")).toBeInTheDocument();
    expect(screen.queryByText(/Ngôn ngữ/)).not.toBeInTheDocument();
  });
});
