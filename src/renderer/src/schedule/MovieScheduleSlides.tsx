import type { ScheduleDisplayMovie } from "@shared/types";
import { useEffect, useMemo, useState } from "react";
import { MOVIES_PER_PAGE } from "./layout";
import MovieScheduleRow from "./MovieScheduleRow";

const SLIDE_INTERVAL_MS = 15_000;
const SLIDE_TRANSITION_MS = 600;

interface MovieScheduleSlidesProps {
  movies: ScheduleDisplayMovie[];
  serverTime: Date;
}

interface MovieSlideTrackProps {
  pages: ScheduleDisplayMovie[][];
  serverTime: Date;
}

const MovieSlideTrack = ({ pages, serverTime }: MovieSlideTrackProps) => {
  const [position, setPosition] = useState({ index: 0, animated: false });
  const pageCount = pages.length;
  const hasSlides = pageCount > 1;

  useEffect(() => {
    if (!hasSlides) return;
    const timer = window.setInterval(() => {
      setPosition((previous) => ({
        index: previous.index >= pageCount ? 1 : previous.index + 1,
        animated: true
      }));
    }, SLIDE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [hasSlides, pageCount]);

  useEffect(() => {
    if (!hasSlides || position.index !== pageCount) return;
    // The final frame duplicates page one, so returning to the real page is invisible.
    const timer = window.setTimeout(() => {
      setPosition({ index: 0, animated: false });
    }, SLIDE_TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [hasSlides, pageCount, position.index]);

  const frames = hasSlides ? [...pages, pages[0]] : pages;

  return (
    <div className="movie-slides-viewport" data-page-count={pageCount}>
      <div
        className="movie-slides-track"
        style={{
          transform: `translateX(-${position.index * 100}%)`,
          transitionDuration: position.animated ? `${SLIDE_TRANSITION_MS}ms` : "0ms"
        }}
      >
        {frames.map((movies, index) => (
          <div
            className="movie-grid"
            key={index}
            role="group"
            aria-label={`Trang lịch chiếu ${(index % pageCount) + 1}/${pageCount}`}
            aria-hidden={index !== position.index}
            data-active={index === position.index}
            data-page={(index % pageCount) + 1}
          >
            {movies.map((movie) => (
              <MovieScheduleRow key={movie.id} movie={movie} serverTime={serverTime} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const MovieScheduleSlides = ({ movies, serverTime }: MovieScheduleSlidesProps) => {
  const pages = useMemo(() => {
    const result: ScheduleDisplayMovie[][] = [];
    for (let index = 0; index < movies.length; index += MOVIES_PER_PAGE) {
      result.push(movies.slice(index, index + MOVIES_PER_PAGE));
    }
    return result;
  }, [movies]);

  // A changed page count starts at page one and cleans up the old carousel timers.
  return pages.length ? (
    <MovieSlideTrack key={pages.length} pages={pages} serverTime={serverTime} />
  ) : null;
};

export default MovieScheduleSlides;
