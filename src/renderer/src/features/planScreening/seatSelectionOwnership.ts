import type { SelectingChairSnapshot } from "@renderer/api/orders.api";

export type SeatOwnersByKey = Map<string, Set<string>>;
export const SELECTION_SYNC_RETRY_DELAYS = [250, 500, 1000] as const;

/** TTL của khóa chọn ghế trên Redis (BE `seat.pos.service` EXPIRED_SELECTING_CHAIR_SECONDS = 300, không gia hạn). */
export const SELECTING_CHAIR_LOCK_TTL_MS = 300_000;
/** Biên an toàn sau TTL: quá mốc này khóa của máy chắc chắn đã hết trên server. */
export const SELECTING_CHAIR_LOCK_EXPIRY_GRACE_MS = 2_000;
/** Nhịp thử nhả lại sau khi hết các lần thử nhanh; giá trị cuối được lặp lại. */
export const PENDING_RELEASE_RETRY_DELAYS = [2_000, 4_000, 8_000, 15_000] as const;
/** Chờ tối thiểu khi server trả 429 mà không có header Retry-After. */
export const RATE_LIMITED_DEFAULT_DELAY_MS = 30_000;
/** Đồng bộ lại snapshot khóa của máy khác: 30 s + jitter 0–15 s, backoff khi lỗi, tối đa 5 phút. */
export const SELECTING_SNAPSHOT_POLL_INTERVAL_MS = 30_000;
export const SELECTING_SNAPSHOT_POLL_JITTER_MS = 15_000;
export const SELECTING_SNAPSHOT_POLL_MAX_DELAY_MS = 300_000;

type RandomSource = () => number;

interface HttpErrorLike {
  response?: { status?: number; headers?: Record<string, unknown> };
}

/** Mốc mà khóa lấy lúc `acquiredAt` chắc chắn đã hết hạn trên server. */
export const getLockReleaseDeadline = (acquiredAt: number) =>
  acquiredAt + SELECTING_CHAIR_LOCK_TTL_MS + SELECTING_CHAIR_LOCK_EXPIRY_GRACE_MS;

/** 429 → thời gian chờ theo Retry-After (giây) hoặc mặc định; lỗi khác → 0. */
export const getRateLimitDelayMs = (error: unknown) => {
  const response = (error as HttpErrorLike | null | undefined)?.response;
  if (response?.status !== 429) return 0;

  const retryAfterSeconds = Number(response.headers?.["retry-after"]);
  return Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
    ? retryAfterSeconds * 1000
    : RATE_LIMITED_DEFAULT_DELAY_MS;
};

const withJitter = (delay: number, random: RandomSource) =>
  Math.round(delay * (0.8 + random() * 0.4));

export const getPendingReleaseRetryDelay = (
  attempt: number,
  { minDelayMs = 0, random = Math.random }: { minDelayMs?: number; random?: RandomSource } = {}
) => {
  const index = Math.min(Math.max(attempt, 1), PENDING_RELEASE_RETRY_DELAYS.length) - 1;
  return Math.max(withJitter(PENDING_RELEASE_RETRY_DELAYS[index], random), minDelayMs);
};

export const getSelectingSnapshotPollDelay = (
  failures: number,
  { minDelayMs = 0, random = Math.random }: { minDelayMs?: number; random?: RandomSource } = {}
) => {
  const base =
    SELECTING_SNAPSHOT_POLL_INTERVAL_MS + Math.round(random() * SELECTING_SNAPSHOT_POLL_JITTER_MS);
  const backedOff = failures > 0 ? base * 2 ** Math.min(failures, 4) : base;
  return Math.min(Math.max(backedOff, minDelayMs), SELECTING_SNAPSHOT_POLL_MAX_DELAY_MS);
};

export interface SeatOwnershipResolution {
  confirmedSeatKeys: Set<string>;
  conflictedSeatKeys: Set<string>;
  missingSeatKeys: Set<string>;
}

export const getSelectionSyncRetryDelay = (attempt: number) =>
  attempt >= 1 && attempt <= SELECTION_SYNC_RETRY_DELAYS.length
    ? SELECTION_SYNC_RETRY_DELAYS[attempt - 1]
    : null;

export const buildSeatOwnersByKey = (
  snapshots: SelectingChairSnapshot[],
  planScreenId: number,
  parseSeatIndexes: (value: string | undefined, floor: number) => string[]
) => {
  const ownersBySeat: SeatOwnersByKey = new Map();

  snapshots.forEach((snapshot) => {
    if (snapshot.planScreenId !== planScreenId) return;

    const seatKeys = [
      ...parseSeatIndexes(snapshot.selectingChairIndexF1, 1),
      ...parseSeatIndexes(snapshot.selectingChairIndexF2, 2),
      ...parseSeatIndexes(snapshot.selectingChairIndexF3, 3)
    ];

    seatKeys.forEach((seatKey) => {
      const owners = ownersBySeat.get(seatKey) || new Set<string>();
      owners.add(snapshot.posName);
      ownersBySeat.set(seatKey, owners);
    });
  });

  return ownersBySeat;
};

export const resolveSeatOwnership = (
  seatKeys: Iterable<string>,
  ownersBySeat: SeatOwnersByKey,
  currentPosName: string
): SeatOwnershipResolution => {
  const confirmedSeatKeys = new Set<string>();
  const conflictedSeatKeys = new Set<string>();
  const missingSeatKeys = new Set<string>();

  for (const seatKey of seatKeys) {
    const owners = ownersBySeat.get(seatKey);

    if (!owners || owners.size === 0) {
      missingSeatKeys.add(seatKey);
      continue;
    }

    if (owners.size === 1 && owners.has(currentPosName)) {
      confirmedSeatKeys.add(seatKey);
      continue;
    }

    conflictedSeatKeys.add(seatKey);
  }

  return {
    confirmedSeatKeys,
    conflictedSeatKeys,
    missingSeatKeys
  };
};
