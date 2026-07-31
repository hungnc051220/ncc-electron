import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrderPaymentUpdatedPayload } from "@shared/types";
import { PaymentStatus } from "@shared/types";
import { ordersKeys } from "@renderer/hooks/orders/keys";
import { planScreeningsKeys } from "@renderer/hooks/planScreenings/keys";
import PlanScreeningPage from "./PlanScreeningPage";

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  paymentUpdatedHandler: undefined as ((payload: OrderPaymentUpdatedPayload) => void) | undefined
}));

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
    data: undefined,
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
  useSelectingChairs: () => ({ mutateAsync: vi.fn() })
}));

vi.mock("@renderer/store/settingPos.store", () => ({
  useSettingPosStore: () => ({ posName: undefined })
}));

vi.mock("@renderer/hooks/useAntdApp", () => ({
  useAntdApp: () => ({ message: { warning: vi.fn() } })
}));

vi.mock("@renderer/api/orders.api", () => ({
  ordersApi: { getSelectingChairs: vi.fn().mockResolvedValue([]) }
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
  onSelectingChairsUpdate: () => vi.fn(),
  onTicketsCancelled: () => vi.fn(),
  onSocketConnect: () => vi.fn()
}));

vi.mock("./components/Actions", () => ({ default: () => null }));
vi.mock("./components/QrCodeDialog", () => ({ default: () => null }));
vi.mock("./components/Seats", () => ({ default: () => null }));

describe("PlanScreeningPage payment updates", () => {
  beforeEach(() => {
    mocks.invalidateQueries.mockReset();
    mocks.paymentUpdatedHandler = undefined;
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
