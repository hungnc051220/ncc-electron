export const SCHEDULE_DISPLAY_TIMEZONE = "Asia/Ho_Chi_Minh" as const;

export interface ScheduleDisplayConfigStatus {
  configured: boolean;
  server: {
    running: boolean;
    port: number;
    error?: string;
  };
  /** The first URL is the recommended physical LAN address. */
  urls: string[];
}

export interface ScheduleDisplayConnectionResult {
  success: boolean;
  message: string;
  movieCount?: number;
}

export interface ScheduleDisplaySession {
  id: string | number;
  time: string;
  startAt: string;
}

export interface ScheduleDisplayMovie {
  id: string | number;
  title: string;
  posterUrl: string | null;
  durationMinutes: number | null;
  /** Optional display metadata; omitted when the schedule source does not provide it. */
  genre?: string | null;
  country?: string | null;
  ageRating: string | null;
  version: string | null;
  language: string | null;
  free: boolean;
  sessions: ScheduleDisplaySession[];
}

export interface ScheduleDisplayPayload {
  date: string;
  timezone: typeof SCHEDULE_DISPLAY_TIMEZONE;
  serverNow: string;
  fetchedAt: string;
  lastSuccessAt: string | null;
  stale: boolean;
  movies: ScheduleDisplayMovie[];
}
