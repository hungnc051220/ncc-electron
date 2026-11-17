import { describe, expect, it } from "vitest";
import type { SelectingChairSnapshot } from "@renderer/api/orders.api";
import {
  buildSeatOwnersByKey,
  getLockReleaseDeadline,
  getPendingReleaseRetryDelay,
  getRateLimitDelayMs,
  getSelectingSnapshotPollDelay,
  getSelectionSyncRetryDelay,
  PENDING_RELEASE_RETRY_DELAYS,
  RATE_LIMITED_DEFAULT_DELAY_MS,
  resolveSeatOwnership,
  SELECTING_CHAIR_LOCK_TTL_MS,
  SELECTING_SNAPSHOT_POLL_MAX_DELAY_MS
} from "./seatSelectionOwnership";

const parseSeatIndexes = (value: string | undefined, floor: number) =>
  (value || "")
    .split(",")
    .map((seat) => seat.trim())
    .filter(Boolean)
    .map((seat) => `${floor}-${seat}`);

const createSnapshot = (
  posName: string,
  selectingChairIndexF1: string,
  planScreenId = 10
): SelectingChairSnapshot => ({
  planScreenId,
  posName,
  selectingChairIndexF1,
  selectingChairIndexF2: "",
  selectingChairIndexF3: ""
});

describe("seatSelectionOwnership", () => {
  it("confirms seats owned exclusively by the current POS", () => {
    const owners = buildSeatOwnersByKey([createSnapshot("POS-01", "1,2")], 10, parseSeatIndexes);

    const result = resolveSeatOwnership(["1-1", "1-2"], owners, "POS-01");

    expect([...result.confirmedSeatKeys]).toEqual(["1-1", "1-2"]);
    expect(result.conflictedSeatKeys.size).toBe(0);
    expect(result.missingSeatKeys.size).toBe(0);
  });

  it("marks seats owned by another POS as conflicted", () => {
    const owners = buildSeatOwnersByKey([createSnapshot("POS-02", "1")], 10, parseSeatIndexes);

    const result = resolveSeatOwnership(["1-1"], owners, "POS-01");

    expect([...result.conflictedSeatKeys]).toEqual(["1-1"]);
  });

  it("marks duplicate ownership as conflicted", () => {
    const owners = buildSeatOwnersByKey(
      [createSnapshot("POS-01", "1"), createSnapshot("POS-02", "1")],
      10,
      parseSeatIndexes
    );

    const result = resolveSeatOwnership(["1-1"], owners, "POS-01");

    expect([...result.conflictedSeatKeys]).toEqual(["1-1"]);
    expect(result.confirmedSeatKeys.size).toBe(0);
  });

  it("marks seats missing from the snapshot separately", () => {
    const result = resolveSeatOwnership(["1-9"], new Map(), "POS-01");

    expect([...result.missingSeatKeys]).toEqual(["1-9"]);
  });

  it("limits selection sync retries to three attempts with backoff", () => {
    expect(getSelectionSyncRetryDelay(1)).toBe(250);
    expect(getSelectionSyncRetryDelay(2)).toBe(500);
    expect(getSelectionSyncRetryDelay(3)).toBe(1000);
    expect(getSelectionSyncRetryDelay(4)).toBeNull();
  });
});

describe("pending release and snapshot polling timing", () => {
  const middle = () => 0.5;

  it("backs pending release retries off to 15 s and repeats the last delay", () => {
    const actualDelays = [1, 2, 3, 4, 5, 20].map((attempt) =>
      getPendingReleaseRetryDelay(attempt, { random: middle })
    );

    expect(actualDelays).toEqual([2000, 4000, 8000, 15000, 15000, 15000]);
  });

  it("keeps the pending release jitter within ±20%", () => {
    const expectedBase = PENDING_RELEASE_RETRY_DELAYS[3];

    expect(getPendingReleaseRetryDelay(4, { random: () => 0 })).toBe(expectedBase * 0.8);
    expect(getPendingReleaseRetryDelay(4, { random: () => 0.999999 })).toBeLessThanOrEqual(
      expectedBase * 1.2
    );
  });

  it("waits at least the rate-limit delay before the next release attempt", () => {
    expect(getPendingReleaseRetryDelay(1, { random: middle, minDelayMs: 30_000 })).toBe(30_000);
  });

  it("polls the snapshot every 30–45 s and backs off up to 5 minutes on errors", () => {
    expect(getSelectingSnapshotPollDelay(0, { random: () => 0 })).toBe(30_000);
    expect(getSelectingSnapshotPollDelay(0, { random: () => 1 })).toBe(45_000);
    expect(getSelectingSnapshotPollDelay(1, { random: () => 0 })).toBe(60_000);
    expect(getSelectingSnapshotPollDelay(2, { random: () => 0 })).toBe(120_000);
    expect(getSelectingSnapshotPollDelay(9, { random: () => 0 })).toBe(
      SELECTING_SNAPSHOT_POLL_MAX_DELAY_MS
    );
    expect(getSelectingSnapshotPollDelay(1, { random: () => 0, minDelayMs: 90_000 })).toBe(90_000);
  });

  it("reads the 429 Retry-After header and ignores other errors", () => {
    expect(
      getRateLimitDelayMs({ response: { status: 429, headers: { "retry-after": "120" } } })
    ).toBe(120_000);
    expect(getRateLimitDelayMs({ response: { status: 429, headers: {} } })).toBe(
      RATE_LIMITED_DEFAULT_DELAY_MS
    );
    expect(getRateLimitDelayMs({ response: { status: 401 } })).toBe(0);
    expect(getRateLimitDelayMs({ response: { status: 422 } })).toBe(0);
    expect(getRateLimitDelayMs(new Error("Network Error"))).toBe(0);
    expect(getRateLimitDelayMs(undefined)).toBe(0);
  });

  it("puts the lock release deadline after the Redis TTL", () => {
    const inputAcquiredAt = 1_000_000;

    const actualDeadline = getLockReleaseDeadline(inputAcquiredAt);

    expect(actualDeadline).toBeGreaterThan(inputAcquiredAt + SELECTING_CHAIR_LOCK_TTL_MS);
    expect(actualDeadline - inputAcquiredAt).toBeLessThanOrEqual(
      SELECTING_CHAIR_LOCK_TTL_MS + 5_000
    );
  });
});
