import type { ScheduleDisplayMovie, ScheduleDisplaySession } from "@shared/types";
import { useState, type CSSProperties } from "react";
import { isScheduleSessionPast } from "./time";

interface MovieScheduleRowProps {
  movie: ScheduleDisplayMovie;
  serverTime: Date;
}

interface SessionGridProps {
  sessions: ScheduleDisplaySession[];
  movieTitle: string;
  serverTime: Date;
}

const SessionGrid = ({ sessions, movieTitle, serverTime }: SessionGridProps) => (
  <div
    className="session-grid"
    aria-label={`Giờ chiếu ${movieTitle}`}
    style={
      {
        "--session-columns": sessions.length > 6 ? 4 : 3,
        "--session-rows": Math.max(1, Math.ceil(sessions.length / (sessions.length > 6 ? 4 : 3)))
      } as CSSProperties
    }
  >
    {sessions.map((session) => (
      <time
        key={session.id}
        dateTime={session.startAt}
        className={`session-time${isScheduleSessionPast(session.startAt, serverTime) ? " session-past" : ""}`}
      >
        <span>{session.time}</span>
      </time>
    ))}
  </div>
);

const MovieScheduleRow = ({ movie, serverTime }: MovieScheduleRowProps) => {
  const [posterState, setPosterState] = useState<"loading" | "loaded" | "error">("loading");
  const age = movie.ageRating?.match(/^[CT](13|16|18)$/i)?.[1];
  const metadata = [
    movie.genre?.trim(),
    movie.country?.trim(),
    movie.durationMinutes ? `${movie.durationMinutes} phút` : null
  ]
    .filter(Boolean)
    .join(" | ");

  return (
    <article className="movie-card" data-movie-id={movie.id}>
      <div className={`movie-poster-shell poster-${posterState}`}>
        {movie.posterUrl && posterState !== "error" ? (
          <img
            className="movie-poster"
            src={movie.posterUrl}
            alt={`Poster ${movie.title}`}
            loading="eager"
            decoding="async"
            onLoad={() => setPosterState("loaded")}
            onError={() => setPosterState("error")}
          />
        ) : (
          <div className="movie-poster-fallback" aria-label="Không có poster">
            <span>NCC</span>
          </div>
        )}
      </div>

      <div className="movie-content">
        <div className="movie-header">
          <h2 className="movie-title" title={movie.title}>
            {movie.title}
          </h2>
          {movie.version ? <span className="version-badge">{movie.version}</span> : null}
        </div>

        {metadata ? (
          <p className="movie-details" title={metadata}>
            {metadata}
          </p>
        ) : null}

        {age ? (
          <p className="age-warning">
            Phim được phổ biến đến người xem từ đủ {age} tuổi trở lên ({age}+)
          </p>
        ) : null}
        {movie.free ? <span className="free-badge">Miễn phí</span> : null}

        <SessionGrid sessions={movie.sessions} movieTitle={movie.title} serverTime={serverTime} />
      </div>
    </article>
  );
};

export default MovieScheduleRow;
