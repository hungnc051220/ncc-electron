import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSelectingSeatsSnapshotPolling } from "./useSelectingSeatsSnapshotPolling";

// Math.random = 0.5 → chu kỳ 30 s + 7,5 s jitter = 37,5 s.
const POLL_MS = 37_500;

const advance = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

const renderPolling = (props: {
  enabled: boolean;
  resetKey: string;
  loadSnapshot: () => Promise<unknown>;
}) =>
  renderHook((current: typeof props) => useSelectingSeatsSnapshotPolling(current), {
    initialProps: props
  });

describe("useSelectingSeatsSnapshotPolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does not poll while disabled", async () => {
    const mockLoad = vi.fn().mockResolvedValue([]);

    renderPolling({ enabled: false, resetKey: "410088:A", loadSnapshot: mockLoad });
    await advance(10 * 60_000);

    expect(mockLoad).not.toHaveBeenCalled();
  });

  it("polls every 30–45 s while enabled", async () => {
    const mockLoad = vi.fn().mockResolvedValue([]);

    renderPolling({ enabled: true, resetKey: "410088:A", loadSnapshot: mockLoad });
    await advance(POLL_MS - 1);
    expect(mockLoad).toHaveBeenCalledTimes(0);
    await advance(1);
    expect(mockLoad).toHaveBeenCalledTimes(1);
    await advance(POLL_MS);

    expect(mockLoad).toHaveBeenCalledTimes(2);
  });

  it("never overlaps requests when a snapshot response is slow", async () => {
    let resolveSlow: (() => void) | undefined;
    const mockLoad = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSlow = resolve;
        })
    );

    renderPolling({ enabled: true, resetKey: "410088:A", loadSnapshot: mockLoad });
    await advance(POLL_MS);
    await advance(5 * POLL_MS);
    expect(mockLoad).toHaveBeenCalledTimes(1);

    resolveSlow?.();
    await advance(POLL_MS);

    expect(mockLoad).toHaveBeenCalledTimes(2);
  });

  it("waits for Retry-After after HTTP 429", async () => {
    const mockLoad = vi
      .fn()
      .mockRejectedValueOnce({ response: { status: 429, headers: { "retry-after": "120" } } })
      .mockResolvedValue([]);

    renderPolling({ enabled: true, resetKey: "410088:A", loadSnapshot: mockLoad });
    await advance(POLL_MS);
    expect(mockLoad).toHaveBeenCalledTimes(1);
    await advance(119_000);
    expect(mockLoad).toHaveBeenCalledTimes(1);
    await advance(1_000);

    expect(mockLoad).toHaveBeenCalledTimes(2);
  });

  it("backs off on repeated 401/422 errors instead of storming the API", async () => {
    const mockLoad = vi.fn().mockRejectedValue({ response: { status: 401 } });

    renderPolling({ enabled: true, resetKey: "410088:A", loadSnapshot: mockLoad });
    await advance(10 * 60_000);

    // 37,5 s → +75 s → +150 s → +300 s: 4 request trong 10 phút thay vì 16.
    expect(mockLoad).toHaveBeenCalledTimes(4);
  });

  it("resets the backoff after a successful poll", async () => {
    const mockLoad = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockResolvedValue([]);

    renderPolling({ enabled: true, resetKey: "410088:A", loadSnapshot: mockLoad });
    await advance(POLL_MS);
    await advance(2 * POLL_MS);
    expect(mockLoad).toHaveBeenCalledTimes(2);
    await advance(POLL_MS);

    expect(mockLoad).toHaveBeenCalledTimes(3);
  });

  it("stops when disabled, on unmount and restarts its timer when the screening changes", async () => {
    const mockLoad = vi.fn().mockResolvedValue([]);
    const { rerender, unmount } = renderPolling({
      enabled: true,
      resetKey: "410088:A",
      loadSnapshot: mockLoad
    });

    await advance(POLL_MS - 10_000);
    rerender({ enabled: true, resetKey: "410089:A", loadSnapshot: mockLoad });
    await advance(10_000);
    expect(mockLoad).toHaveBeenCalledTimes(0);
    await advance(POLL_MS - 10_000);
    expect(mockLoad).toHaveBeenCalledTimes(1);

    rerender({ enabled: false, resetKey: "410089:A", loadSnapshot: mockLoad });
    await advance(5 * POLL_MS);
    expect(mockLoad).toHaveBeenCalledTimes(1);

    rerender({ enabled: true, resetKey: "410089:A", loadSnapshot: mockLoad });
    unmount();
    await advance(5 * POLL_MS);

    expect(mockLoad).toHaveBeenCalledTimes(1);
  });
});
