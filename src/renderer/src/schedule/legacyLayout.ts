import type { ScheduleLayout, ScheduleViewport } from "./layout";

export const needsLegacyScheduleLayout = () => {
  const supports = window.CSS?.supports;
  return (
    !supports ||
    ![
      ["display", "grid"],
      ["color", "var(--schedule-color)"],
      ["height", "100dvh"],
      ["aspect-ratio", "2 / 3"],
      ["height", "1cqh"]
    ].every(([property, value]) => window.CSS.supports(property, value))
  );
};

const px = (value: number) => `${Math.max(0, value)}px`;
const setBox = (element: HTMLElement, left: number, top: number, width: number, height: number) => {
  Object.assign(element.style, {
    position: "absolute",
    left: px(left),
    top: px(top),
    width: px(width),
    height: px(height)
  });
};

// Mirror the approved schedule.css geometry only on browsers missing its layout features.
// Explicit pixel tracks replace Grid, var(), dvh, aspect-ratio and container units.
// The existing slide track, timers, film order and server clock remain untouched.
export const applyLegacyScheduleLayout = (
  root: HTMLElement,
  layout: ScheduleLayout,
  viewport: ScheduleViewport
) => {
  const vw = viewport.width / 100;
  const portrait = layout.orientation === "portrait";
  const rows = layout.rows;
  const width = viewport.width - 5.4 * vw;
  const headerHeight = (portrait ? 11.7 : 9) * vw;
  const footerHeight = (portrait ? 15.3 : 3) * vw;
  const contentTop = (1.9 + 0.85) * vw + headerHeight;
  const contentHeight = Math.max(
    0,
    viewport.height - (3.4 + 1.7) * vw - headerHeight - footerHeight
  );
  const rowGap = (portrait ? 1.7 : 0.3) * vw;
  const columnGap = 1.7 * vw;
  const gridHeight = contentHeight + (portrait ? (rows - 1) * 1.05 * vw : 0);
  const cardWidth = (width - columnGap) / 2;
  const cardHeight = (gridHeight - (rows - 1) * rowGap) / rows;
  const select = (selector: string) => root.querySelector<HTMLElement>(selector)!;

  root.style.width = px(viewport.width);
  root.style.height = px(viewport.height);
  setBox(select(".schedule-header"), 2.7 * vw, 1.9 * vw, width, headerHeight);
  select(".clock-caption").style.display = root.querySelector(".stale-badge") ? "none" : "";
  setBox(select(".schedule-content"), 2.7 * vw, contentTop, width, contentHeight);
  setBox(
    select(".schedule-footer"),
    2.7 * vw,
    viewport.height - 1.5 * vw - footerHeight,
    width,
    footerHeight
  );

  const slides = root.querySelector<HTMLElement>(".movie-slides-viewport");
  if (!slides) return;
  slides.style.height = px(gridHeight);
  const border = Math.max(1, 0.1 * vw);
  const padding = (portrait ? 0.55 : 0.25) * vw;
  const innerHeight = Math.max(0, cardHeight - 2 * (border + padding));
  const innerWidth = cardWidth - 2 * (border + padding);
  const posterWidth = portrait
    ? innerWidth * 0.28
    : Math.min(innerWidth * 0.3, (innerHeight * 2) / 3);

  root.querySelectorAll<HTMLElement>(".movie-grid").forEach((grid) => {
    grid.style.height = px(gridHeight);
    grid.querySelectorAll<HTMLElement>(".movie-card").forEach((card, index) => {
      setBox(
        card,
        (index % 2) * (cardWidth + columnGap),
        Math.floor(index / 2) * (cardHeight + rowGap),
        cardWidth,
        cardHeight
      );
      card.style.borderWidth = px(border);
      const poster = card.querySelector<HTMLElement>(".movie-poster-shell")!;
      poster.style.width = px(posterWidth);
      poster.style.height = px(innerHeight);
      const content = card.querySelector<HTMLElement>(".movie-content")!;
      content.style.height = px(innerHeight);
      const sessions = card.querySelector<HTMLElement>(".session-grid")!;
      const times = sessions.querySelectorAll<HTMLElement>(".session-time");
      const columns = times.length > 6 ? 4 : 3;
      const sessionRows = Math.max(1, Math.ceil(times.length / columns));
      const gapY = (portrait ? 0.4 : 0.3) * vw;
      const gapX = (portrait ? (columns === 4 ? 0.35 : 0.85) : 0.3) * vw;
      const chipWidth = (portrait ? 7.15 : 3.5) * vw;
      const desiredHeight =
        sessionRows * (portrait ? 2.8 : 1.6) * vw + (sessionRows - 1) * 0.4 * vw;
      const contentStyle = window.getComputedStyle(content);
      let available =
        innerHeight - parseFloat(contentStyle.paddingTop) - parseFloat(contentStyle.paddingBottom);
      Array.from(content.children).forEach((child) => {
        if (child === sessions) return;
        const style = window.getComputedStyle(child);
        available -=
          (child as HTMLElement).offsetHeight +
          parseFloat(style.marginTop) +
          parseFloat(style.marginBottom);
      });
      const height = Math.max(0, Math.min(desiredHeight, available - (portrait ? 0.15 : 0.2) * vw));
      sessions.style.height = px(height);
      const chipHeight = Math.max(0, (height - (sessionRows - 1) * gapY) / sessionRows);
      times.forEach((time, sessionIndex) => {
        setBox(
          time,
          (sessionIndex % columns) * (chipWidth + gapX),
          Math.floor(sessionIndex / columns) * (chipHeight + gapY),
          chipWidth,
          chipHeight
        );
        const chipBorder = Math.max(1, 0.13 * vw);
        time.style.borderWidth = px(chipBorder);
        time.querySelector<HTMLElement>("span")!.style.fontSize = px(
          Math.min((portrait ? 1.5 : 0.95) * vw, Math.max(0, chipHeight - chipBorder * 2) * 0.65)
        );
      });
    });
  });
};
