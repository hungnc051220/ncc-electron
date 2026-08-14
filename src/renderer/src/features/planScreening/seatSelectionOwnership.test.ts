import { describe, expect, it } from "vitest";
import type { SelectingChairSnapshot } from "@renderer/api/orders.api";
import {
  buildSeatOwnersByKey,
  getSelectionSyncRetryDelay,
  resolveSeatOwnership
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
