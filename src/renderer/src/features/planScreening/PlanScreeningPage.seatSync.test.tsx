import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ListSeat, PlanScreeningDetailProps, SelectingChairPayload } from "@shared/types";
import PlanScreeningPage from "./PlanScreeningPage";
import { SELECTING_CHAIR_LOCK_TTL_MS } from "./seatSelectionOwnership";

/**
 * Đồng bộ ghế đang chọn khi request nhả lỗi tạm thời (BUG-02, D.2.1), khi socket kết nối lại (D.2.2) và khi khóa
 * của máy khác chỉ biết qua snapshot rồi hết TTL không có event (BUG-02b, D.2.4). Fake timers + "server" giả giữ
 * khóa theo (posName, ghế) như key Redis `selecting-chairs-{suất}-{posName}-{ghế}`.
 */
const SCREENING_ID = 410088;
const OWN_POS = "POS-01";
const OTHER_POS = "POS-02";

type SelectingCall = {
  operation: "add" | "remove";
  dto: { planScreenId: number; posName: string; selectingChairIndexF1: string };
};

const mocks = vi.hoisted(() => {
  const messageWarning = vi.fn();
  const messageError = vi.fn();
  const messageSuccess = vi.fn();

  return {
    screeningId: "410088",
    connectHandlers: new Set<() => void>(),
    selectingChairsHandler: undefined as ((payload: SelectingChairPayload) => void) | undefined,
    getSelectingChairs: vi.fn(),
    mutateSelectingChairs: vi.fn(),
    messageWarning,
    messageError,
    messageSuccess,
    messageApi: { warning: messageWarning, error: messageError, success: messageSuccess },
    planData: undefined as PlanScreeningDetailProps | undefined,
    seatsProps: undefined as Record<string, unknown> | undefined,
    actionsProps: undefined as Record<string, unknown> | undefined
  };
});

vi.mock("antd", () => ({
  Button: () => null,
  Result: () => null,
  Spin: ({ children }: { children: React.ReactNode }) => children
}));
vi.mock("react-router", () => ({ useParams: () => ({ id: mocks.screeningId }) }));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() })
}));
vi.mock("@renderer/hooks/planScreenings/usePlanScreeningDetail", () => ({
  usePlanScreeningDetail: () => ({ data: mocks.planData, isFetching: false, refetch: vi.fn() })
}));
vi.mock("@renderer/hooks/orders/useOrdersByScreening", () => ({
  useOrdersByScreening: () => ({ data: [], isFetching: false, refetch: vi.fn() })
}));
vi.mock("@renderer/hooks/seatIconConfigs/useEffectiveSeatIcon", () => ({
  useEffectiveSeatIcon: () => ({ imageUrl: null, refetch: vi.fn() })
}));
vi.mock("@renderer/hooks/seatTypes/useSeatTypes", () => ({
  useSeatTypes: () => ({ data: { data: [] } })
}));
vi.mock("@renderer/hooks/orders/useSelectingChairs", () => ({
  useSelectingChairs: () => ({ mutateAsync: mocks.mutateSelectingChairs })
}));
vi.mock("@renderer/store/settingPos.store", () => ({
  useSettingPosStore: () => ({ posName: "POS-01" })
}));
vi.mock("@renderer/hooks/useAntdApp", () => ({
  useAntdApp: () => ({ message: mocks.messageApi })
}));
vi.mock("@renderer/api/orders.api", () => ({
  ordersApi: { getSelectingChairs: mocks.getSelectingChairs }
}));
vi.mock("@renderer/socket/socket", () => ({
  onOrderPaymentUpdated: () => vi.fn(),
  onOrderCreated: () => vi.fn(),
  onOrderUpdated: () => vi.fn(),
  onTicketsCancelled: () => vi.fn(),
  onSelectingChairsUpdate: (callback: (payload: SelectingChairPayload) => void) => {
    mocks.selectingChairsHandler = callback;
    return () => {
      mocks.selectingChairsHandler = undefined;
    };
  },
  onSocketConnect: (callback: () => void) => {
    mocks.connectHandlers.add(callback);
    return () => mocks.connectHandlers.delete(callback);
  }
}));
vi.mock("./components/Actions", () => ({
  default: (props: Record<string, unknown>) => {
    mocks.actionsProps = props;
    return null;
  }
}));
vi.mock("./components/QrCodeDialog", () => ({ default: () => null }));
vi.mock("./components/Seats", () => ({
  default: (props: Record<string, unknown>) => {
    mocks.seatsProps = props;
    return null;
  }
}));

const makeSeat = (column: number): ListSeat => ({
  seat: String(column),
  rows: 1,
  column,
  y: 1,
  code: `A${column}`,
  type: 0,
  status: 0,
  floor: 1,
  price: 100000,
  checkinStatus: 0,
  isInvitation: 0,
  isContract: 0,
  isHold: 0,
  positionId: 1,
  positionName: "Thường"
});
const S1 = makeSeat(1);
const S2 = makeSeat(2);
const S3 = makeSeat(3);

/** Khóa trên "Redis" giả: key = `${planScreenId}|${posName}|${ghế}`. */
const server = {
  locks: new Set<string>(),
  removeError: null as unknown,
  snapshotError: null as unknown,
  lockKey: (planScreenId: number, posName: string, seatIndex: string) =>
    `${planScreenId}|${posName}|${seatIndex}`
};

const networkError = Object.assign(new Error("Network Error"), { code: "ERR_NETWORK" });

/** Như BE `getSelectingChairs`: mỗi key Redis (mỗi ghế) là một mục riêng của snapshot. */
const snapshotOf = (planScreenId: number) =>
  Array.from(server.locks)
    .map((key) => key.split("|"))
    .filter(([lockScreenId]) => Number(lockScreenId) === planScreenId)
    .map(([, posName, seatIndex]) => ({
      planScreenId,
      posName,
      selectingChairIndexF1: seatIndex,
      selectingChairIndexF2: "",
      selectingChairIndexF3: ""
    }));

/** Như BE `modifySelectingChair`: add = SET NX từng ghế (đã có key → 400), remove = DEL đúng key của posName. */
const fakeServer = async ({ operation, dto }: SelectingCall) => {
  const seatIndexes = dto.selectingChairIndexF1.split(",").filter(Boolean);
  if (operation === "remove" && server.removeError) throw server.removeError;

  seatIndexes.forEach((seatIndex) => {
    const key = server.lockKey(dto.planScreenId, dto.posName, seatIndex);
    if (operation === "remove") {
      server.locks.delete(key);
      return;
    }
    if (server.locks.has(key)) {
      throw Object.assign(new Error("Seat is already being selected"), {
        response: { status: 400 }
      });
    }
    server.locks.add(key);
  });
};

const advance = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

const selectSeats = async (seats: ListSeat[]) => {
  act(() => {
    (mocks.seatsProps?.setSelectedSeats as (next: ListSeat[]) => void)(seats);
  });
  await advance(50);
};

const removeCalls = () =>
  (mocks.mutateSelectingChairs.mock.calls as [SelectingCall][])
    .map(([call]) => call)
    .filter((call) => call.operation === "remove");

const addCalls = () =>
  (mocks.mutateSelectingChairs.mock.calls as [SelectingCall][])
    .map(([call]) => call)
    .filter((call) => call.operation === "add");

const fireSocketConnect = () => {
  act(() => {
    Array.from(mocks.connectHandlers).forEach((handler) => handler());
  });
};

/** Chọn ghế (khóa thành công), rồi bỏ chọn khi mọi request remove đều lỗi: hết 4 lần thử nhanh (0/250/500/1000 ms). */
const selectThenFailRelease = async (seats: ListSeat[]) => {
  await selectSeats(seats);
  await advance(1_000);
  server.removeError = networkError;
  await selectSeats([]);
  await advance(250 + 500 + 1000 + 100);
};

describe("PlanScreeningPage seat release (BUG-02) and snapshot reconciliation (BUG-02b)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    server.locks.clear();
    server.removeError = null;
    server.snapshotError = null;
    mocks.screeningId = String(SCREENING_ID);
    mocks.connectHandlers.clear();
    mocks.selectingChairsHandler = undefined;
    mocks.seatsProps = undefined;
    mocks.actionsProps = undefined;
    mocks.messageWarning.mockReset();
    mocks.messageError.mockReset();
    mocks.messageSuccess.mockReset();
    mocks.planData = { id: SCREENING_ID, listSeats: [[S1, S2, S3]] } as PlanScreeningDetailProps;
    mocks.mutateSelectingChairs.mockReset().mockImplementation(fakeServer);
    mocks.getSelectingChairs.mockReset().mockImplementation(async (planScreenId: number) => {
      if (server.snapshotError) throw server.snapshotError;
      return snapshotOf(planScreenId);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("releases a deselected seat with one request when the server answers", async () => {
    render(<PlanScreeningPage />);
    await advance(0);

    await selectSeats([S1]);
    await advance(1_000);
    await selectSeats([]);
    await advance(60_000);

    expect(removeCalls()).toHaveLength(1);
    expect(server.locks.size).toBe(0);
    expect(mocks.messageWarning).not.toHaveBeenCalled();
  });

  it("keeps retrying a failed release and frees the seat once the network is back (D.2.1)", async () => {
    render(<PlanScreeningPage />);
    await advance(0);

    await selectThenFailRelease([S1]);
    expect(removeCalls()).toHaveLength(4);
    expect(server.locks.has(server.lockKey(SCREENING_ID, OWN_POS, "1"))).toBe(true);
    expect(mocks.messageWarning).toHaveBeenCalledTimes(1);
    expect(mocks.messageWarning).toHaveBeenCalledWith(
      expect.stringContaining("Chưa thể giải phóng trạng thái ghế trên máy chủ")
    );

    server.removeError = null;
    await advance(2_000);

    expect(removeCalls()).toHaveLength(5);
    expect(server.locks.size).toBe(0);
    expect(mocks.messageSuccess).toHaveBeenCalledTimes(1);
    await advance(10 * 60_000);
    expect(removeCalls()).toHaveLength(5);
    expect(mocks.messageWarning).toHaveBeenCalledTimes(1);
  });

  it("sends every pending seat in one request per attempt and frees them all", async () => {
    render(<PlanScreeningPage />);
    await advance(0);

    await selectThenFailRelease([S1, S2, S3]);
    expect(removeCalls().every((call) => call.dto.selectingChairIndexF1 === "1,2,3")).toBe(true);

    server.removeError = null;
    await advance(2_000);

    expect(server.locks.size).toBe(0);
    expect(removeCalls()).toHaveLength(5);
  });

  it("keeps every seat pending when they are deselected one by one during the failure (TC-10)", async () => {
    render(<PlanScreeningPage />);
    await advance(0);

    await selectSeats([S1, S2, S3]);
    await advance(1_000);
    server.removeError = networkError;
    await selectSeats([S2, S3]);
    await advance(150);
    await selectSeats([S3]);
    await advance(150);
    await selectSeats([]);
    await advance(250 + 500 + 1000 + 100);
    const lastFailedRemove = removeCalls().at(-1);

    server.removeError = null;
    await advance(2_000);

    expect(lastFailedRemove?.dto.selectingChairIndexF1.split(",").sort()).toEqual(["1", "2", "3"]);
    expect(server.locks.size).toBe(0);
    expect(addCalls()).toHaveLength(1);
    expect(mocks.messageError).not.toHaveBeenCalled();
  });

  it("stops at the lock TTL when the server stays unreachable and tells the cashier", async () => {
    render(<PlanScreeningPage />);
    await advance(0);

    await selectSeats([S1]);
    await advance(1_000);
    server.removeError = networkError;
    server.snapshotError = networkError;
    await selectSeats([]);
    await advance(SELECTING_CHAIR_LOCK_TTL_MS + 10_000);

    const actualAttempts = removeCalls().length;
    // 4 lần thử nhanh + backoff 2/4/8/15 s tới TTL ≈ 25 request trong 5 phút, không phải 6 phút liên tục.
    expect(actualAttempts).toBeGreaterThan(10);
    expect(actualAttempts).toBeLessThanOrEqual(30);
    expect(mocks.messageWarning).toHaveBeenLastCalledWith(expect.stringContaining("đã tự hết hạn"));

    await advance(10 * 60_000);
    expect(removeCalls()).toHaveLength(actualAttempts);
  });

  it("stops as soon as the server snapshot no longer lists the lock (TTL already expired)", async () => {
    render(<PlanScreeningPage />);
    await advance(0);

    await selectThenFailRelease([S1]);
    const attemptsBeforeExpiry = removeCalls().length;

    server.locks.clear();
    await advance(2_000);
    await advance(10 * 60_000);

    expect(removeCalls()).toHaveLength(attemptsBeforeExpiry + 1);
  });

  it("never touches a seat another POS took after this POS's lock expired", async () => {
    render(<PlanScreeningPage />);
    await advance(0);

    await selectThenFailRelease([S1]);
    const attemptsBeforeTakeover = removeCalls().length;

    server.locks.clear();
    server.locks.add(server.lockKey(SCREENING_ID, OTHER_POS, "1"));
    await advance(2_000);
    server.removeError = null;
    await advance(10 * 60_000);

    expect(removeCalls()).toHaveLength(attemptsBeforeTakeover + 1);
    expect(removeCalls().every((call) => call.dto.posName === OWN_POS)).toBe(true);
    expect(server.locks.has(server.lockKey(SCREENING_ID, OTHER_POS, "1"))).toBe(true);
    expect(mocks.seatsProps?.selectingSeatsByOther).toEqual({ "1-1": OTHER_POS });
  });

  it("cancels the pending release when the cashier selects the same seat again", async () => {
    render(<PlanScreeningPage />);
    await advance(0);

    await selectThenFailRelease([S1]);
    const attemptsBeforeReselect = removeCalls().length;
    const addsBeforeReselect = addCalls().length;

    await selectSeats([S1]);
    await advance(1_000);
    server.removeError = null;
    await advance(60_000);

    expect(removeCalls()).toHaveLength(attemptsBeforeReselect);
    expect(addCalls()).toHaveLength(addsBeforeReselect);
    expect(server.locks.has(server.lockKey(SCREENING_ID, OWN_POS, "1"))).toBe(true);
    expect(mocks.actionsProps?.selectedSeats).toEqual([S1]);
    expect(mocks.actionsProps?.isSeatSelectionPending).toBe(false);
  });

  it("retries the pending release right away when the socket reconnects (D.2.2)", async () => {
    render(<PlanScreeningPage />);
    await advance(0);

    await selectThenFailRelease([S1]);
    await advance(2_000 + 4_000 + 8_000 + 100);
    const attemptsBeforeReconnect = removeCalls().length;

    server.removeError = null;
    fireSocketConnect();
    await advance(10);

    expect(removeCalls()).toHaveLength(attemptsBeforeReconnect + 1);
    expect(server.locks.size).toBe(0);
    await advance(60_000);
    expect(removeCalls()).toHaveLength(attemptsBeforeReconnect + 1);
  });

  it("does not stack requests when the socket reconnects several times during a slow release", async () => {
    render(<PlanScreeningPage />);
    await advance(0);

    await selectThenFailRelease([S1]);
    let resolveSlowRemove: (() => void) | undefined;
    mocks.mutateSelectingChairs.mockImplementation(async (call: SelectingCall) => {
      if (call.operation !== "remove") return fakeServer(call);
      await new Promise<void>((resolve) => {
        resolveSlowRemove = resolve;
      });
      throw networkError;
    });
    const attemptsBeforeReconnect = removeCalls().length;

    fireSocketConnect();
    await advance(10);
    fireSocketConnect();
    fireSocketConnect();
    await advance(10);
    expect(removeCalls()).toHaveLength(attemptsBeforeReconnect + 1);

    mocks.mutateSelectingChairs.mockImplementation(fakeServer);
    server.removeError = null;
    resolveSlowRemove?.();
    await advance(10);

    // Một lượt chạy lại ngay (yêu cầu từ các lần reconnect), không phải ba.
    expect(removeCalls()).toHaveLength(attemptsBeforeReconnect + 2);
    expect(server.locks.size).toBe(0);
  });

  it("stops retrying after unmount (one last best-effort release only)", async () => {
    const { unmount } = render(<PlanScreeningPage />);
    await advance(0);

    await selectThenFailRelease([S1]);
    const attemptsBeforeUnmount = removeCalls().length;

    unmount();
    await advance(10 * 60_000);

    expect(removeCalls()).toHaveLength(attemptsBeforeUnmount + 1);
  });

  it("stops retrying the old screening after switching screenings", async () => {
    const { rerender } = render(<PlanScreeningPage />);
    await advance(0);

    await selectThenFailRelease([S1]);
    const attemptsBeforeSwitch = removeCalls().length;

    mocks.screeningId = "410089";
    mocks.planData = { id: 410089, listSeats: [[S1, S2, S3]] } as PlanScreeningDetailProps;
    rerender(<PlanScreeningPage />);
    await advance(10 * 60_000);

    const oldScreeningRemoves = removeCalls().filter(
      (call) => call.dto.planScreenId === SCREENING_ID
    );
    expect(oldScreeningRemoves).toHaveLength(attemptsBeforeSwitch + 1);
  });

  it("clears another POS lock known only from the snapshot once its TTL passes (TC-09c)", async () => {
    server.locks.add(server.lockKey(SCREENING_ID, OTHER_POS, "2"));
    render(<PlanScreeningPage />);
    await advance(0);
    expect(mocks.seatsProps?.selectingSeatsByOther).toEqual({ "1-2": OTHER_POS });

    server.locks.clear();
    await advance(37_500);

    expect(mocks.seatsProps?.selectingSeatsByOther).toEqual({});
    const callsAfterClear = mocks.getSelectingChairs.mock.calls.length;
    await advance(10 * 60_000);
    expect(mocks.getSelectingChairs.mock.calls.length).toBe(callsAfterClear);
  });

  it("does not poll the snapshot when no other POS lock is shown", async () => {
    render(<PlanScreeningPage />);
    await advance(0);
    const callsAfterMount = mocks.getSelectingChairs.mock.calls.length;

    await advance(10 * 60_000);

    expect(mocks.getSelectingChairs.mock.calls.length).toBe(callsAfterMount);
  });

  it("keeps a newer socket lock when an older snapshot answer arrives late", async () => {
    server.locks.add(server.lockKey(SCREENING_ID, OTHER_POS, "1"));
    render(<PlanScreeningPage />);
    await advance(0);

    let resolveStale: (() => void) | undefined;
    const staleSnapshot = snapshotOf(SCREENING_ID);
    mocks.getSelectingChairs.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveStale = () => resolve(staleSnapshot);
        })
    );
    await advance(37_500);

    server.locks.add(server.lockKey(SCREENING_ID, OTHER_POS, "2"));
    act(() => {
      mocks.selectingChairsHandler?.({
        planScreenId: SCREENING_ID,
        posName: OTHER_POS,
        selectingChairIndexF1: "1,2",
        selectingChairIndexF2: "",
        selectingChairIndexF3: "",
        operation: "add",
        expiredSeconds: 300
      });
    });
    await act(async () => {
      resolveStale?.();
    });
    await advance(50);

    expect(mocks.seatsProps?.selectingSeatsByOther).toEqual({ "1-1": OTHER_POS, "1-2": OTHER_POS });
  });

  it("backs the snapshot poll off on HTTP 429 and 401 without a request storm", async () => {
    server.locks.add(server.lockKey(SCREENING_ID, OTHER_POS, "1"));
    render(<PlanScreeningPage />);
    await advance(0);
    const callsAfterMount = mocks.getSelectingChairs.mock.calls.length;

    server.snapshotError = { response: { status: 429, headers: { "retry-after": "120" } } };
    await advance(37_500);
    server.snapshotError = { response: { status: 401 } };
    await advance(10 * 60_000);

    // 37,5 s (429) → +120 s → +150 s → +300 s: tối đa 4 request trong 10,6 phút.
    expect(mocks.getSelectingChairs.mock.calls.length - callsAfterMount).toBeLessThanOrEqual(4);
    expect(mocks.seatsProps?.selectingSeatsByOther).toEqual({ "1-1": OTHER_POS });
  });
});
