import type { ScheduleDisplayPayload } from "@shared/types";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { applyLegacyScheduleLayout, needsLegacyScheduleLayout } from "./legacyLayout";
import "./legacy.css";
import { getScheduleRotation, rotateScheduleCss } from "./displayRotation";
import scheduleCss from "./schedule.css?inline";
import legacyCss from "./legacy.css?inline";
import { getScheduleLayout, type ScheduleViewport } from "./layout";
import MovieScheduleSlides from "./MovieScheduleSlides";
import ScheduleHeader from "./ScheduleHeader";
import { ReelIcon } from "./ScheduleIcons";
import {
  formatScheduleClock,
  formatScheduleDataTime,
  formatScheduleDate,
  formatScheduleWeekday,
  getServerOffset,
  getServerTime
} from "./time";

const REFRESH_INTERVAL_MS = 60_000;
const CLOCK_INTERVAL_MS = 1_000;

const readViewport = (): ScheduleViewport => ({
  width: window.innerWidth,
  height: window.innerHeight,
  devicePixelRatio: window.devicePixelRatio || 1
});

const getErrorMessage = async (response: Response) => {
  try {
    const body = (await response.json()) as { message?: unknown };
    if (typeof body.message === "string") return body.message;
  } catch {
    // Use the HTTP fallback when the response is not JSON.
  }
  return `Không thể tải lịch chiếu (HTTP ${response.status})`;
};

const App = () => {
  const screenRef = useRef<HTMLElement>(null);
  const [rotation] = useState(() => getScheduleRotation(window.location.search));
  const [legacyLayout] = useState(() => Boolean(rotation) || needsLegacyScheduleLayout());
  const [data, setData] = useState<ScheduleDisplayPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serverOffset, setServerOffset] = useState(0);
  const [serverTime, setServerTime] = useState(() => new Date());
  const [physicalViewport, setViewport] = useState(readViewport);
  const viewport = useMemo(
    () =>
      rotation
        ? {
            ...physicalViewport,
            width: physicalViewport.height,
            height: physicalViewport.width
          }
        : physicalViewport,
    [physicalViewport, rotation]
  );

  const loadSchedule = useCallback(async () => {
    try {
      const response = await fetch("/schedule/api", { cache: "no-store" });
      if (!response.ok) throw new Error(await getErrorMessage(response));

      const payload = (await response.json()) as ScheduleDisplayPayload;
      const nextOffset = getServerOffset(payload.serverNow);
      setData(payload);
      setServerOffset(nextOffset);
      setServerTime(getServerTime(nextOffset));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải lịch chiếu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSchedule();
    const refreshTimer = window.setInterval(() => void loadSchedule(), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(refreshTimer);
  }, [loadSchedule]);

  useEffect(() => {
    const clockTimer = window.setInterval(
      () => setServerTime(getServerTime(serverOffset)),
      CLOCK_INTERVAL_MS
    );
    return () => window.clearInterval(clockTimer);
  }, [serverOffset]);

  useEffect(() => {
    const handleResize = () => setViewport(readViewport());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const averageSessionCount = useMemo(() => {
    if (!data?.movies.length) return 0;
    return (
      data.movies.reduce((total, movie) => total + movie.sessions.length, 0) / data.movies.length
    );
  }, [data]);
  const layout = useMemo(
    () => getScheduleLayout(data?.movies.length ?? 0, viewport, averageSessionCount),
    [averageSessionCount, data?.movies.length, viewport]
  );
  const gridStyle = {
    "--schedule-columns": layout.columns,
    "--schedule-rows": layout.rows
  } as CSSProperties;

  useLayoutEffect(() => {
    let active = true;
    let rotatedStyle: HTMLStyleElement | undefined;
    if (rotation) {
      rotatedStyle = document.createElement("style");
      rotatedStyle.id = "schedule-rotation-styles";
      rotatedStyle.textContent = rotateScheduleCss(
        scheduleCss + "\n" + legacyCss,
        viewport.width,
        viewport.height
      );
      document.head.appendChild(rotatedStyle);
    }
    const applyLayout = () => {
      if (active && legacyLayout && screenRef.current)
        applyLegacyScheduleLayout(screenRef.current, layout, viewport);
    };
    applyLayout();
    if (legacyLayout) {
      const fontsReady = document.fonts?.ready;
      // Older TV browsers can expose ready without a callable Promise.then.
      // Font readiness is optional: the initial layout must still mount.
      if (fontsReady && typeof fontsReady.then === "function") void fontsReady.then(applyLayout);
    }
    return () => {
      active = false;
      rotatedStyle?.remove();
    };
  }, [data, layout, legacyLayout, rotation, viewport]);

  return (
    <main
      ref={screenRef}
      className={`schedule-screen density-${layout.density} orientation-${layout.orientation}${legacyLayout ? " schedule-legacy" : ""}`}
      data-density={layout.density}
      data-orientation={layout.orientation}
      data-viewport={`${viewport.width}x${viewport.height}`}
      data-dpr={viewport.devicePixelRatio}
      data-rotation={rotation}
      style={
        rotation
          ? {
              position: "absolute",
              left: 0,
              top: 0,
              transformOrigin: "0 0",
              transform: `translate(${rotation === 90 ? physicalViewport.width : 0}px, ${rotation === 270 ? physicalViewport.height : 0}px) rotate(${rotation}deg)`
            }
          : undefined
      }
    >
      <ScheduleHeader
        date={data ? formatScheduleDate(serverTime) : "--/--/----"}
        clock={data ? formatScheduleClock(serverTime) : "--:--:--"}
        weekday={data ? formatScheduleWeekday(serverTime) : ""}
        staleTime={
          data?.stale && data.lastSuccessAt ? formatScheduleDataTime(data.lastSuccessAt) : undefined
        }
      />

      {error && data ? <div className="connection-banner">Mất kết nối · {error}</div> : null}

      <section className="schedule-content" style={gridStyle}>
        {loading && !data ? (
          <div className="state-card" data-testid="schedule-loading">
            <div className="loading-ring" />
            <h2>Đang tải lịch chiếu</h2>
          </div>
        ) : error && !data ? (
          <div className="state-card state-card-error">
            <h2>Không thể tải lịch chiếu</h2>
            <p>{error}</p>
            <p>Hệ thống sẽ tự động thử lại.</p>
          </div>
        ) : data?.movies.length ? (
          <MovieScheduleSlides movies={data.movies} serverTime={serverTime} />
        ) : (
          <div className="state-card">
            <h2>Hôm nay chưa có lịch chiếu</h2>
            <p>Vui lòng theo dõi lại sau.</p>
          </div>
        )}
      </section>
      <footer className="schedule-footer" aria-hidden="true">
        <span>Điện ảnh kiến tạo những khoảnh khắc đáng nhớ</span>
        <ReelIcon />
        <span className="footer-brand">National Cinema Center</span>
      </footer>
    </main>
  );
};

export default App;
