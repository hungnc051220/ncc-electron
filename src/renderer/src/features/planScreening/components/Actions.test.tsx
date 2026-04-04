import { ReactNode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { formatMoney } from "@renderer/lib/utils";
import { usePrinterStore } from "@renderer/store/printer.store";
import { useSettingPosStore } from "@renderer/store/settingPos.store";
import { DiscountProps, ListSeat, PaymentType, PlanScreeningDetailProps } from "@shared/types";
import Actions from "./Actions";

let paymentUpdatedHandler:
  | ((payload: { paymentStatus: number; orderId: string }) => void)
  | undefined;
let screeningOrdersMock: Array<{
  id: number;
  items: Array<{
    listChairValueF1?: string;
    listChairValueF2?: string;
    listChairValueF3?: string;
  }>;
}> = [];
const mocks = vi.hoisted(() => ({
  createOrderMutate: vi.fn(),
  createQrMutateAsync: vi.fn(),
  cancelOrderMutate: vi.fn(),
  cancelReserve: vi.fn(),
  messageSuccess: vi.fn(),
  messageError: vi.fn(),
  invalidateQueries: vi.fn()
}));

vi.mock("antd", async () => {
  const actual = await vi.importActual<typeof import("antd")>("antd");

  return {
    ...actual,
    message: {
      success: mocks.messageSuccess,
      error: mocks.messageError
    }
  };
});

vi.mock("@renderer/hooks/discounts/useDiscounts", () => ({
  useDiscounts: () => ({
    data: {
      data: [
        {
          id: 1,
          discountName: "Giam 10%",
          discountType: "PERCENT",
          discountAmount: 0,
          discountRate: 10,
          deleted: false,
          createdOnUtc: "2026-03-16T00:00:00.000Z",
          createdUser: "tester",
          updatedOnUtc: "2026-03-16T00:00:00.000Z",
          updatedUser: "tester"
        },
        {
          id: 2,
          discountName: "Giam 20k",
          discountType: "AMOUNT",
          discountAmount: 20000,
          discountRate: 0,
          deleted: false,
          createdOnUtc: "2026-03-16T00:00:00.000Z",
          createdUser: "tester",
          updatedOnUtc: "2026-03-16T00:00:00.000Z",
          updatedUser: "tester"
        }
      ] satisfies DiscountProps[]
    }
  })
}));

vi.mock("@renderer/hooks/orders/useCreateOrder", () => ({
  useCreateOrder: () => ({
    mutate: mocks.createOrderMutate,
    isPending: false
  })
}));

vi.mock("@renderer/hooks/orders/useCreateQrOrder", () => ({
  useCreateQrOrder: () => ({
    mutateAsync: mocks.createQrMutateAsync,
    isPending: false
  })
}));

vi.mock("@renderer/hooks/orders/useOrdersByScreening", () => ({
  useOrdersByScreening: () => ({
    data: screeningOrdersMock
  })
}));

vi.mock("@renderer/hooks/orders/useCancelOrder", () => ({
  useCancelOrder: () => ({
    mutate: mocks.cancelOrderMutate,
    isPending: false
  })
}));

vi.mock("@renderer/hooks/users/useUserDetail", () => ({
  useUserDetail: () => ({
    data: {
      fullname: "Cashier"
    }
  })
}));

vi.mock("@renderer/api/cancellationReasons.api", () => ({
  cancellationReasonsApi: {
    getAll: vi.fn().mockResolvedValue({
      data: [
        {
          id: 1,
          reason: "Khach doi y"
        }
      ],
      pageCount: 1
    })
  }
}));

vi.mock("@renderer/permissions/usePermission", () => ({
  usePermission: () => ({
    can: (_resource: string, action: string) => action !== "print"
  })
}));

vi.mock("@renderer/socket/socket", () => ({
  onOrderPaymentUpdated: (callback: typeof paymentUpdatedHandler) => {
    paymentUpdatedHandler = callback;
    return () => {
      paymentUpdatedHandler = undefined;
    };
  }
}));

vi.mock("./DiscountPopup", () => ({
  default: ({
    selectedSeats,
    onChange
  }: {
    selectedSeats: ListSeat[];
    onChange: (value: Record<string, number>) => void;
  }) => (
    <button
      type="button"
      data-testid="apply-discount"
      onClick={() =>
        onChange(Object.fromEntries(selectedSeats.map((seat) => [`${seat.floor}-${seat.seat}`, 1])))
      }
    >
      Apply discount
    </button>
  )
}));

vi.mock("./QrCodeDialog", () => ({
  default: ({
    open,
    onCancel,
    dataQr
  }: {
    open: boolean;
    onCancel?: () => void;
    dataQr: { seats: string };
  }) =>
    open ? (
      <div data-testid="qr-dialog">
        <p>{dataQr.seats}</p>
        <button type="button" onClick={onCancel}>
          Dong QR
        </button>
      </div>
    ) : null
}));

vi.mock("./VipCardDialog", () => ({
  default: () => null
}));

vi.mock("../../invoices/components/InvoiceDialog", () => ({
  default: () => null
}));

vi.mock("@renderer/api/orders.api", () => ({
  ordersApi: {
    cancelReserve: mocks.cancelReserve
  }
}));

const queryClientMock = {
  invalidateQueries: mocks.invalidateQueries
};

vi.mock("@tanstack/react-query", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");

  return {
    ...actual,
    useInfiniteQuery: () => ({
      data: {
        pages: [
          {
            data: [
              {
                id: 1,
                reason: "Khach doi y"
              }
            ],
            pageCount: 1
          }
        ]
      },
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetching: false,
      isFetchingNextPage: false
    }),
    useQueryClient: () => queryClientMock
  };
});

const createSeat = (overrides: Partial<ListSeat> = {}): ListSeat => ({
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
  positionName: "Thuong",
  ...overrides
});

const createPlanScreening = (): PlanScreeningDetailProps => ({
  id: 1,
  planCinemaId: 1,
  projectDate: "2099-03-20",
  projectTime: "2099-03-20T10:00:00.000Z",
  filmId: 1,
  roomId: 1,
  daypartId: 1,
  deleted: false,
  noOnlineChairF1: "",
  noOnlineChairF2: "",
  noOnlineChairF3: "",
  isSelling: 1,
  isOnlineSelling: 1,
  priceOfPosition1: "100000",
  priceOfPosition2: "120000",
  priceOfPosition3: "150000",
  priceOfPosition4: "0",
  createdOnUtc: "2026-03-16T00:00:00.000Z",
  createdUser: "tester",
  updatedOnUtc: "2026-03-16T00:00:00.000Z",
  updatedUser: "tester",
  roomInfo: {
    id: 1,
    name: "Phong 1",
    wideSizeF1: 2,
    deepSizeF1: 2,
    wideSizeF2: 0,
    deepSizeF2: 0,
    wideSizeF3: 0,
    deepSizeF3: 0,
    ruleOrder: "",
    noBreak: false,
    numberOfFloor: 1,
    pictureId: 1,
    deleted: false,
    subjectToAcl: false,
    limitedToStores: false,
    orderNo: 1,
    floor: "1"
  },
  filmInfo: {
    id: 1,
    filmNameEn: "Movie",
    filmName: "Movie",
    countryId: 1,
    duration: 120,
    director: "",
    actors: "",
    introduction: "",
    manufacturerId: 1,
    versionCode: "2D",
    statusCode: "SHOWING",
    languageCode: "vi",
    holding: "",
    description: "",
    sellOnline: true,
    metaDescription: "",
    metaKeyword: "",
    metaTitle: "",
    limitedToStores: false,
    subjectToAcl: false,
    createdOnUtc: "2026-03-16T00:00:00.000Z",
    updatedOnUtc: "2026-03-16T00:00:00.000Z",
    published: true,
    deleted: false,
    pictureId: 1,
    imageUrl: "",
    premieredDay: "2026-03-01",
    videoUrl: "",
    showOnHomePage: false,
    tags: "",
    allowCustomerReviews: false,
    approvedRatingSum: 0,
    notApprovedRatingSum: 0,
    approvedTotalReviews: 0,
    notApprovedTotalReviews: 0,
    totalLike: 0,
    numberOfViews: 0,
    isHot: 0,
    ageAbove: 13,
    proposedPrice: 0,
    trailerOnHomePage: false,
    orderNo: 1,
    sellOnlineBefore: 0,
    createdUser: "tester",
    updatedUser: "tester"
  },
  orders: [],
  listSeats: []
});

const renderWithProviders = (ui: ReactNode, { route = "/" }: { route?: string } = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
};

const getMoneyTexts = (amount: number) =>
  screen.getAllByText(
    (content) => content.replace(/\s/g, "") === formatMoney(amount).replace(/\s/g, "")
  );

describe("Actions", () => {
  beforeEach(() => {
    paymentUpdatedHandler = undefined;
    screeningOrdersMock = [];
    mocks.createOrderMutate.mockReset();
    mocks.createQrMutateAsync.mockReset();
    mocks.cancelOrderMutate.mockReset();
    mocks.cancelReserve.mockReset();
    mocks.messageSuccess.mockReset();
    mocks.messageError.mockReset();
    mocks.invalidateQueries.mockReset();

    sessionStorage.clear();
    useSettingPosStore.setState({
      posName: "POS Machine 1",
      posShortName: "M11"
    });
    usePrinterStore.setState({
      printers: [],
      selectedPrinter: "Printer A",
      loading: false
    });
    window.api = {
      sendQrOpen: vi.fn(),
      sendQrClose: vi.fn(),
      printTickets: vi.fn()
    } as unknown as typeof window.api;
  });

  it("shows the correct totals for selected seats and applied discounts", async () => {
    renderWithProviders(
      <Actions
        data={createPlanScreening()}
        planScreenId={1}
        selectedSeats={[createSeat(), createSeat({ seat: "2", code: "A2", price: 150000 })]}
        setSelectedSeats={vi.fn()}
        cancelMode={false}
        setCancelMode={vi.fn()}
      />
    );

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(getMoneyTexts(250000)).toHaveLength(2);
    expect(screen.getByText("Chọn giảm giá")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("apply-discount"));

    await waitFor(() => {
      expect(getMoneyTexts(25000)).toHaveLength(1);
      expect(getMoneyTexts(225000)).toHaveLength(1);
    });
  });

  it("keeps only the last selected QR payment method", async () => {
    renderWithProviders(
      <Actions
        data={createPlanScreening()}
        planScreenId={1}
        selectedSeats={[createSeat()]}
        setSelectedSeats={vi.fn()}
        cancelMode={false}
        setCancelMode={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText("Quét VietQR"));
    fireEvent.click(screen.getByLabelText("Quét VNPayQR"));

    expect(screen.getByLabelText("Quét VietQR")).not.toBeChecked();
    expect(screen.getByLabelText("Quét VNPayQR")).toBeChecked();
  });

  it("creates a QR order and opens the QR dialog", async () => {
    mocks.createOrderMutate.mockImplementation(
      (
        _body: unknown,
        options: {
          onSuccess: (order: {
            id: number;
            orderTotal: number;
            orderDiscount: number;
            createdOnUtc: string;
          }) => Promise<void>;
        }
      ) => {
        void options.onSuccess({
          id: 99,
          orderTotal: 90000,
          orderDiscount: 10000,
          createdOnUtc: "2026-03-16T10:00:00.000Z"
        });
      }
    );
    mocks.createQrMutateAsync.mockResolvedValue({
      qrcode: "vietqr://payload",
      referenceLabelCode: "REF-99",
      accountName: "NCC",
      accountNumber: "123456789",
      accountBankName: "VietinBank"
    });

    renderWithProviders(
      <Actions
        data={createPlanScreening()}
        planScreenId={1}
        selectedSeats={[createSeat(), createSeat({ seat: "2", code: "A2" })]}
        setSelectedSeats={vi.fn()}
        cancelMode={false}
        setCancelMode={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText("Quét VietQR"));
    fireEvent.click(screen.getByRole("button", { name: /in vé/i }));

    await waitFor(() => {
      expect(mocks.createQrMutateAsync).toHaveBeenCalledWith({
        orderId: 99,
        paymentMethod: PaymentType.VIETQR,
        shortName: "M11"
      });
      expect(screen.getByTestId("qr-dialog")).toBeInTheDocument();
      expect(screen.getByText("A1, A2")).toBeInTheDocument();
    });
  });

  it("cancels the order and shows an error when QR creation fails", async () => {
    mocks.createOrderMutate.mockImplementation(
      (
        _body: unknown,
        options: {
          onSuccess: (order: {
            id: number;
            orderTotal: number;
            orderDiscount: number;
            createdOnUtc: string;
          }) => Promise<void>;
        }
      ) => {
        void options.onSuccess({
          id: 100,
          orderTotal: 100000,
          orderDiscount: 0,
          createdOnUtc: "2026-03-16T10:00:00.000Z"
        });
      }
    );
    mocks.createQrMutateAsync.mockRejectedValue(new Error("qr failed"));

    renderWithProviders(
      <Actions
        data={createPlanScreening()}
        planScreenId={1}
        selectedSeats={[createSeat()]}
        setSelectedSeats={vi.fn()}
        cancelMode={false}
        setCancelMode={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText("Quét VietQR"));
    fireEvent.click(screen.getByRole("button", { name: /in vé/i }));

    await waitFor(() => {
      expect(mocks.cancelOrderMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          orderIds: [100],
          planScreenId: 1
        }),
        expect.any(Object)
      );
      expect(mocks.messageError).toHaveBeenCalledWith("Tạo QR thất bại");
    });
  });

  it("clears seats and closes the QR dialog when payment succeeds from the socket event", async () => {
    const setSelectedSeats = vi.fn();
    mocks.createOrderMutate.mockImplementation(
      (
        _body: unknown,
        options: {
          onSuccess: (order: {
            id: number;
            orderTotal: number;
            orderDiscount: number;
            createdOnUtc: string;
          }) => Promise<void>;
        }
      ) => {
        void options.onSuccess({
          id: 101,
          orderTotal: 100000,
          orderDiscount: 0,
          createdOnUtc: "2026-03-16T10:00:00.000Z"
        });
      }
    );
    mocks.createQrMutateAsync.mockResolvedValue({
      qrcode: "vietqr://payload",
      referenceLabelCode: "REF-101",
      accountName: "NCC",
      accountNumber: "123456789",
      accountBankName: "VietinBank"
    });

    renderWithProviders(
      <Actions
        data={createPlanScreening()}
        planScreenId={33}
        selectedSeats={[createSeat()]}
        setSelectedSeats={setSelectedSeats}
        cancelMode={false}
        setCancelMode={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText("Quét VietQR"));
    fireEvent.click(screen.getByRole("button", { name: /in vé/i }));

    await waitFor(() => {
      expect(screen.getByTestId("qr-dialog")).toBeInTheDocument();
    });

    await act(async () => {
      paymentUpdatedHandler?.({ paymentStatus: 30, orderId: "101" });
    });

    await waitFor(() => {
      expect(setSelectedSeats).toHaveBeenCalledWith([]);
      expect(mocks.messageSuccess).toHaveBeenCalledWith(
        "Thanh toán thành công! Đang cập nhật dữ liệu..."
      );
      expect(sessionStorage.getItem("lastTotal")).toBe("100000");
      expect(
        screen.getAllByText(
          (content) => content.replace(/\s/g, "") === formatMoney(100000).replace(/\s/g, "")
        )
      ).not.toHaveLength(0);
      expect(window.api?.sendQrClose).toHaveBeenCalled();
      expect(screen.queryByTestId("qr-dialog")).not.toBeInTheDocument();
      expect(mocks.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["plan-screening", 33]
      });
    });
  });

  it("disables ticket actions when the screening time has passed", () => {
    renderWithProviders(
      <Actions
        data={{
          ...createPlanScreening(),
          projectDate: "2026-03-16",
          projectTime: "2026-03-16T00:00:00.000Z"
        }}
        planScreenId={1}
        selectedSeats={[createSeat()]}
        setSelectedSeats={vi.fn()}
        cancelMode={false}
        setCancelMode={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /giữ chỗ/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /huỷ giữ/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /in vé/i })).toBeDisabled();
  });

  it("cancels reserved seats with all matching order ids", async () => {
    screeningOrdersMock = [
      {
        id: 201,
        items: [{ listChairValueF1: "A1" }]
      },
      {
        id: 202,
        items: [{ listChairValueF1: "A2" }]
      }
    ];
    mocks.cancelReserve.mockResolvedValue(undefined);

    renderWithProviders(
      <Actions
        data={createPlanScreening()}
        planScreenId={1}
        selectedSeats={[
          createSeat({ seat: "1", code: "A1" }),
          createSeat({ seat: "2", code: "A2" })
        ]}
        setSelectedSeats={vi.fn()}
        cancelMode={false}
        setCancelMode={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /huỷ giữ/i }));

    await waitFor(() => {
      expect(mocks.cancelReserve).toHaveBeenCalledWith({
        listChairIndexF1: ["1", "2"],
        listChairIndexF2: [],
        listChairIndexF3: [],
        orderIds: [201, 202]
      });
      expect(mocks.messageSuccess).toHaveBeenCalledWith("Huỷ giữ chỗ thành công");
    });
  });
});
