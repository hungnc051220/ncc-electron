export type ScheduleDensity = "full" | "compact" | "ultra";

export const MOVIES_PER_PAGE = 16;

export interface ScheduleViewport {
  width: number;
  height: number;
  devicePixelRatio: number;
}

export interface ScheduleLayout {
  columns: number;
  rows: number;
  density: ScheduleDensity;
  orientation: "portrait" | "landscape";
}

export const getScheduleLayout = (
  movieCount: number,
  viewport: ScheduleViewport,
  averageSessionCount = 0
): ScheduleLayout => {
  const count = Math.min(Math.max(movieCount, 1), MOVIES_PER_PAGE);
  const orientation = viewport.height > viewport.width ? "portrait" : "landscape";
  let density: ScheduleDensity = count <= 12 ? "full" : "compact";

  if (averageSessionCount >= 9 && movieCount > 8 && density === "full") density = "compact";

  const columns = 2;

  return {
    columns,
    rows: Math.ceil(count / columns),
    density,
    orientation
  };
};
