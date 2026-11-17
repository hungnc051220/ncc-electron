import { useEffect, useRef } from "react";
import { getRateLimitDelayMs, getSelectingSnapshotPollDelay } from "./seatSelectionOwnership";

interface SelectingSeatsSnapshotPollingOptions {
  /** Chỉ bật khi đang hiển thị khóa của máy khác trên suất hiện tại. */
  enabled: boolean;
  /** Đổi suất chiếu hoặc posName thì khởi động lại vòng đồng bộ. */
  resetKey: string;
  /** Đọc snapshot `selecting-chairs` và ghi vào state; ném lỗi khi request thất bại. */
  loadSnapshot: () => Promise<unknown>;
}

/**
 * Đồng bộ lại snapshot khóa chọn ghế của máy khác theo chu kỳ 30–45 s (có jitter) khi đang hiển thị khóa đó.
 *
 * Redis hết TTL không phát event socket, và khóa chỉ biết qua snapshot (reload, mở lại sơ đồ, reconnect) không có
 * hạn phía client, nên chỉ vòng đồng bộ này gỡ được trạng thái disabled cũ (BUG-02b). Mỗi lúc chỉ có một request;
 * lỗi thì giãn chu kỳ (429 theo Retry-After); dừng khi tắt, khi đổi suất và khi unmount.
 */
export const useSelectingSeatsSnapshotPolling = ({
  enabled,
  resetKey,
  loadSnapshot
}: SelectingSeatsSnapshotPollingOptions) => {
  const loadSnapshotRef = useRef(loadSnapshot);

  useEffect(() => {
    loadSnapshotRef.current = loadSnapshot;
  }, [loadSnapshot]);

  useEffect(() => {
    if (!enabled) return;

    let isDisposed = false;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = (delay: number) => {
      timer = setTimeout(() => {
        timer = null;
        void poll();
      }, delay);
    };

    const poll = async () => {
      let minDelayMs = 0;

      try {
        await loadSnapshotRef.current();
        failures = 0;
      } catch (error) {
        failures += 1;
        minDelayMs = getRateLimitDelayMs(error);
        console.warn("[selecting-chairs] snapshot poll failed:", error);
      }

      if (!isDisposed) schedule(getSelectingSnapshotPollDelay(failures, { minDelayMs }));
    };

    schedule(getSelectingSnapshotPollDelay(0));

    return () => {
      isDisposed = true;
      if (timer) clearTimeout(timer);
    };
  }, [enabled, resetKey]);
};
