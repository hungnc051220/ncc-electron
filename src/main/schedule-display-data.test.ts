import { describe, expect, it } from "vitest";
import {
  formatScheduleServerTime,
  getScheduleApiDateKey,
  normalizeScheduleDisplayData
} from "./schedule-display-data";

describe("normalizeScheduleDisplayData", () => {
  it("selects the Vietnam calendar day, filters deleted data and sorts films by first session", () => {
    const result = normalizeScheduleDisplayData(
      {
        listday: [
          { Day: "9-9-2026", lstFilm: [] },
          {
            Day: "10-9-2026",
            lstFilm: [
              {
                Id: 2,
                FilmName: "Phim chiếu sau",
                ImageUrl: "https://example.com/two.jpg",
                Duration: 120,
                VersionCode: "2D",
                LanguageCode: "PDV",
                AgeAboveShow: "C16",
                isFree: false,
                lstSession: [
                  { Id: 22, ProjectTime: "2026-09-10T20:00:00", Deleted: false },
                  { Id: 21, ProjectTime: "2026-09-10T18:00:00", Deleted: false },
                  { Id: 20, ProjectTime: "2026-09-10T17:00:00", Deleted: true }
                ]
              },
              {
                Id: 1,
                FilmName: "Phim chiếu trước",
                isFree: true,
                lstSession: [{ Id: 10, ProjectTime: "2026-09-10T08:30:00" }]
              },
              {
                Id: 3,
                FilmName: "Phim đã xóa",
                Deleted: true,
                lstSession: [{ Id: 30, ProjectTime: "2026-09-10T09:00:00" }]
              },
              { Id: 4, FilmName: "Không có suất", lstSession: [] }
            ]
          }
        ]
      },
      new Date("2026-09-09T18:30:00.000Z")
    );

    expect(result.date).toBe("2026-09-10");
    expect(result.movies.map((movie) => movie.title)).toEqual([
      "Phim chiếu trước",
      "Phim chiếu sau"
    ]);
    expect(result.movies[0].free).toBe(true);
    expect(result.movies[1]).toMatchObject({
      posterUrl: "https://example.com/two.jpg",
      durationMinutes: 120,
      version: "2D",
      language: "PDV",
      ageRating: "C16"
    });
    expect(result.movies[1].sessions).toEqual([
      { id: 21, time: "18:00", startAt: "2026-09-10T18:00:00+07:00" },
      { id: 22, time: "20:00", startAt: "2026-09-10T20:00:00+07:00" }
    ]);
  });

  it("returns an empty schedule when the current date is absent", () => {
    const result = normalizeScheduleDisplayData(
      { listday: [{ Day: "11-9-2026", lstFilm: [] }] },
      new Date("2026-09-10T02:00:00.000Z")
    );

    expect(result.date).toBe("2026-09-10");
    expect(result.movies).toEqual([]);
  });

  it("uses one-digit API dates and emits Vietnam server time", () => {
    const date = new Date("2026-03-04T02:05:06.000Z");
    expect(getScheduleApiDateKey(date)).toBe("4-3-2026");
    expect(formatScheduleServerTime(date)).toBe("2026-03-04T09:05:06+07:00");
  });
});
