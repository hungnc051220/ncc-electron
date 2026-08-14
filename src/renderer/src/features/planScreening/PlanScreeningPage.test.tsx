import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ListSeat,
  OrderPaymentUpdatedPayload,
  PlanScreeningDetailProps,
  SelectingChairPayload
} from "@shared/types";
import { PaymentStatus } from "@shared/types";
import { ordersKeys } from "@renderer/hooks/orders/keys";
import { planScreeningsKeys } from "@renderer/hooks/planScreenings/keys";
import PlanScreeningPage from "./PlanScreeningPage";

const mocks = vi.hoisted(() => {
  const messageWarning = vi.fn();
  const messageError = vi.fn();

  return {
    invalidateQueries: vi.fn(),
    paymentUpdatedHandler: undefined as ((payload: OrderPaymentUpdatedPayload) => void) | undefined,
    selectingChairsHandler: undefined as ((payload: SelectingChairPayload) => void) | undefined,
    getSelectingChairs: vi.fn(),
    mutateSelectingChairs: vi.fn(),
    messageWarning,
    messageError,
    messageApi: { warning: messageWarning, error: messageError },
    planData: undefined as PlanScreeningDetailProps | undefined,
    posName: undefined as string | undefined,
    seatsProps: undefined as Record<string, unknown> | undefined,
    actionsProps: undefined as Record<string, unknown> | undefined
  };
});

vi.mock("antd", () => ({
  Button: () => null,
  Result: () => null,
  Spin: ({ children }: { children: React.ReactNode }) => children
}));

vi.mock("react-router", () => ({
  useParams: () => ({ id: "410078" })
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries })
}));

vi.mock("@renderer/hooks/planScreenings/usePlanScreeningDetail", () => ({
  usePlanScreeningDetail: () => ({
    data: mocks.planData,
    isFetching: false,
    refetch: vi.fn()
  })
}));

vi.mock("@renderer/hooks/orders/useOrdersByScreening", () => ({
  useOrdersByScreening: () => ({
    data: [],
    isFetching: false,
    refetch: vi.fn()
  })
}));

vi.mock("@renderer/hooks/seatTypes/useSeatTypes", () => ({
  useSeatTypes: () => ({ data: { data: [] } })
}));

vi.mock("@renderer/hooks/orders/useSelectingChairs", () => ({
  useSelectingChairs: () => ({ mutateAsync: mocks.mutateSelectingChairs })
}));

vi.mock("@renderer/store/settingPos.store", () => ({
  useSettingPosStore: () => ({ posName: mocks.posName })
}));

vi.mock("@renderer/hooks/useAntdApp", () => ({
  useAntdApp: () => ({ message: mocks.messageApi })
}));

vi.mock("@renderer/api/orders.api", () => ({
  ordersApi: { getSelectingChairs: mocks.getSelectingChairs }
}));

vi.mock("@renderer/socket/socket", () => ({
  onOrderPaymentUpdated: (callback: (payload: OrderPaymentUpdatedPayload) => void) => {
    mocks.paymentUpdatedHandler = callback;
    return () => {
      mocks.paymentUpdatedHandler = undefined;
    };
  },
  onOrderCreated: () => vi.fn(),
  onOrderUpdated: () => vi.fn(),
  onSelectingChairsUpdate: (callback: (payload: SelectingChairPayload) => void) => {
    mocks.selectingChairsHandler = callback;
    return () => {
      mocks.selectingChairsHandler = undefined;
    };
  },
  onTicketsCancelled: () => vi.fn(),
  onSocketConnect: () => vi.fn()
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

describe("PlanScreeningPage payment updates", () => {
  beforeEach(() => {
    mocks.invalidateQueries.mockReset();
    mocks.paymentUpdatedHandler = undefined;
    mocks.selectingChairsHandler = undefined;
    mocks.getSelectingChairs.mockReset().mockResolvedValue([]);
    mocks.mutateSelectingChairs.mockReset().mockResolvedValue(undefined);
    mocks.messageWarning.mockReset();
    mocks.messageError.mockReset();
    mocks.planData = undefined;
    mocks.posName = undefined;
    mocks.seatsProps = undefined;
    mocks.actionsProps = undefined;
  });

  it("refreshes screening and order data when payment fails", () => {
    render(<PlanScreeningPage />);

    act(() => {
      mocks.paymentUpdatedHandler?.({
        orderId: "10249536",
        orderStatus: 30,
        paymentStatus: PaymentStatus.FAIL,
        shippingStatus: 10,
        transactionId: "",
        amount: 190000,
        planScreenId: 410078
      });
    });

    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: planScreeningsKeys.getDetail(410078)
    });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ordersKeys.getOrdersByScreening(410078)
    });
  });

  it("ignores payment updates from another screening", () => {
    render(<PlanScreeningPage />);

    act(() => {
      mocks.paymentUpdatedHandler?.({
        orderId: "10249536",
        orderStatus: 30,
        paymentStatus: PaymentStatus.VOIDED,
        shippingStatus: 10,
        transactionId: "",
        amount: 190000,
        planScreenId: 999999
      });
    });

    expect(mocks.invalidateQueries).not.toHaveBeenCalled();
  });
});

const seat: ListSeat = {
  seat: "1",
  rows: 1,
  column: 1,
  y: 1,
  code: "A1",
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
};

describe("PlanScreeningPage seat ownership", () => {
  beforeEach(() => {
    mocks.getSelectingChairs.mockReset().mockResolvedValue([]);
    mocks.mutateSelectingChairs.mockReset().mockResolvedValue(undefined);
    mocks.messageWarning.mockReset();
    mocks.messageError.mockReset();
    mocks.selectingChairsHandler = undefined;
    mocks.seatsProps = undefined;
    mocks.actionsProps = undefined;
    mocks.planData = {
      id: 410078,
      listSeats: [[seat]]
    } as PlanScreeningDetailProps;
    mocks.posName = "POS-01";
  });

  it("confirms a selected seat only after the server snapshot belongs exclusively to this POS", async () => {
    let snapshots: Array<Record<string, unknown>> = [];
    mocks.getSelectingChairs.mockImplementation(async () => snapshots);
    mocks.mutateSelectingChairs.mockImplementation(async ({ operation }: { operation: string }) => {
      if (operation === "add") {
        snapshots = [
          {
            planScreenId: 410078,
            posName: "POS-01",
            selectingChairIndexF1: "1",
            selectingChairIndexF2: "",
            selectingChairIndexF3: ""
          }
        ];
      }
    });

    render(<PlanScreeningPage />);

    act(() => {
      const setSelectedSeats = mocks.seatsProps?.setSelectedSeats as
        | ((seats: ListSeat[]) => void)
        | undefined;
      setSelectedSeats?.([seat]);
    });

    await waitFor(() => {
      expect(mocks.mutateSelectingChairs).toHaveBeenCalledWith(
        expect.objectContaining({ operation: "add" })
      );
    });
    await waitFor(
      () => {
        expect(mocks.actionsProps?.isSeatSelectionPending).toBe(false);
      },
      { timeout: 1500 }
    );
  });

  it("blocks actions and removes a local seat when another POS also owns it", async () => {
    let snapshots: Array<Record<string, unknown>> = [];
    mocks.getSelectingChairs.mockImplementation(async () => snapshots);
    mocks.mutateSelectingChairs.mockImplementation(async ({ operation }: { operation: string }) => {
      if (operation === "add") {
        snapshots = [
          {
            planScreenId: 410078,
            posName: "POS-01",
            selectingChairIndexF1: "1",
            selectingChairIndexF2: "",
            selectingChairIndexF3: ""
          }
        ];
      }
    });

    render(<PlanScreeningPage />);
    act(() => {
      const setSelectedSeats = mocks.seatsProps?.setSelectedSeats as
        | ((seats: ListSeat[]) => void)
        | undefined;
      setSelectedSeats?.([seat]);
    });

    await waitFor(
      () => {
        expect(mocks.actionsProps?.isSeatSelectionPending).toBe(false);
      },
      { timeout: 1500 }
    );

    snapshots = [
      {
        planScreenId: 410078,
        posName: "POS-01",
        selectingChairIndexF1: "1",
        selectingChairIndexF2: "",
        selectingChairIndexF3: ""
      },
      {
        planScreenId: 410078,
        posName: "POS-02",
        selectingChairIndexF1: "1",
        selectingChairIndexF2: "",
        selectingChairIndexF3: ""
      }
    ];

    act(() => {
      mocks.selectingChairsHandler?.({
        planScreenId: 410078,
        posName: "POS-02",
        selectingChairIndexF1: "1",
        selectingChairIndexF2: "",
        selectingChairIndexF3: "",
        operation: "add",
        expiredSeconds: 30
      });
    });

    expect(mocks.actionsProps?.isSeatSelectionPending).toBe(true);

    await waitFor(
      () => {
        expect(mocks.actionsProps?.selectedSeats).toEqual([]);
        expect(mocks.messageWarning).toHaveBeenCalledWith(expect.stringContaining("Ghế A1"));
      },
      { timeout: 1500 }
    );
  });
});
