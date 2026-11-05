import { ReactNode } from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { formatMoney } from "@renderer/lib/utils";
import { usePrinterStore } from "@renderer/store/printer.store";
import { useSettingPosStore } from "@renderer/store/settingPos.store";
import {
  DiscountProps,
  ListSeat,
  OrderPaperVoucherResult,
  OrderStatus,
  PaperVoucherBatch,
  PaperVoucherOrderQuote,
  PaperVoucherQuoteLine,
  PaymentType,
  PlanScreeningDetailProps
} from "@shared/types";
import type { OrderDto } from "@renderer/api/orders.api";
import { ordersKeys } from "@renderer/hooks/orders/keys";
import {
  PAPER_VOUCHER_NETWORK_ERROR_MESSAGE,
  PAPER_VOUCHER_PREVIOUS_NOT_RECORDED_MESSAGE,
  PAPER_VOUCHER_QUOTE_CHANGED_MESSAGE,
  PAPER_VOUCHER_REQUEST_IN_PROGRESS_MESSAGE
} from "./paperVoucherSale";
import {
  PAPER_VOUCHER_FIXTURES,
  setupPaperVoucherServer,
  stubObjectUrls
} from "@renderer/features/paperVouchers/paperVoucher.testUtils";
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
  updateOrderMutate: vi.fn(),
  updateOrderMutateAsync: vi.fn(),
  getOrderDetail: vi.fn(),
  checkTransaction: vi.fn(),
  cancelReserve: vi.fn(),
  quoteOrder: vi.fn(),
  getPaperVoucherRequestStatus: vi.fn(),
  messageSuccess: vi.fn(),
  messageError: vi.fn(),
  messageWarning: vi.fn(),
  invalidateQueries: vi.fn(),
  modalConfirm: vi.fn()
}));

vi.mock("@renderer/features/paperVouchers/paperVoucher.utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@renderer/features/paperVouchers/paperVoucher.utils")>()),
  getVietnamBusinessDate: () => "2026-10-30"
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

vi.mock("@renderer/hooks/orders/useUpdateOrder", () => ({
  useUpdateOrder: () => ({
    mutate: mocks.updateOrderMutate,
    mutateAsync: mocks.updateOrderMutateAsync,
    isPending: false
  })
}));

vi.mock("@renderer/hooks/useAntdApp", () => ({
  useAntdApp: () => ({
    message: {
      success: mocks.messageSuccess,
      error: mocks.messageError,
      warning: mocks.messageWarning
    },
    modal: {
      confirm: mocks.modalConfirm
    }
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
    onCheckTransaction,
    dataQr
  }: {
    open: boolean;
    onCancel?: () => void;
    onCheckTransaction?: () => void;
    dataQr: { seats: string };
  }) =>
    open ? (
      <div data-testid="qr-dialog">
        <p>{dataQr.seats}</p>
        <button type="button" onClick={onCancel}>
          Dong QR
        </button>
        <button type="button" onClick={onCheckTransaction}>
          Kiem tra QR
        </button>
      </div>
    ) : null
}));

vi.mock("./VipCardDialog", () => ({
  default: ({
    open,
    onBooking,
    onCancel
  }: {
    open: boolean;
    onBooking: (params: Record<string, unknown>) => void;
    onCancel: () => void;
  }) =>
    open ? (
      <button
        type="button"
        data-testid="vip-card-confirm"
        onClick={() => {
          onBooking({ customerId: 7, memberCardCode: "VIP007", pointReward: 10000 });
          onCancel();
        }}
      >
        Xác nhận thẻ
      </button>
    ) : null
}));

vi.mock("../../invoices/components/InvoiceDialog", () => ({
  default: ({ open, orderId }: { open: boolean; orderId: number }) =>
    open ? <div data-testid="invoice-dialog">Invoice order {orderId}</div> : null
}));

vi.mock("@renderer/api/orders.api", () => ({
  ordersApi: {
    cancelReserve: mocks.cancelReserve,
    quote: mocks.quoteOrder,
    getPaperVoucherRequestStatus: mocks.getPaperVoucherRequestStatus,
    getDetail: mocks.getOrderDetail,
    checkTransaction: mocks.checkTransaction
  }
}));

const queryClientMock = {
  invalidateQueries: mocks.invalidateQueries,
  fetchQuery: ({ queryFn }: { queryFn: () => Promise<unknown> }) => queryFn()
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
    mocks.updateOrderMutate.mockReset();
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

    // Ngược lại (option sau → option trước) cũng chuyển sang lựa chọn mới.
    fireEvent.click(screen.getByLabelText("Quét VietQR"));

    expect(screen.getByLabelText("Quét VietQR")).toBeChecked();
    expect(screen.getByLabelText("Quét VNPayQR")).not.toBeChecked();

    // Bỏ chọn phương thức đang chọn: về tiền mặt.
    fireEvent.click(screen.getByLabelText("Quét VietQR"));

    expect(screen.getByLabelText("Quét VietQR")).not.toBeChecked();
    expect(screen.getByLabelText("Quét VNPayQR")).not.toBeChecked();
  });

  it("keeps selected seats until screening data is refreshed after creating an order", async () => {
    const setSelectedSeats = vi.fn();
    let resolveRefresh: () => void = () => {};
    const refreshPromise = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });

    mocks.invalidateQueries.mockReturnValue(refreshPromise);
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
          id: 98,
          orderTotal: 100000,
          orderDiscount: 0,
          createdOnUtc: "2026-03-16T10:00:00.000Z"
        });
      }
    );

    renderWithProviders(
      <Actions
        data={createPlanScreening()}
        planScreenId={1}
        selectedSeats={[createSeat()]}
        setSelectedSeats={setSelectedSeats}
        cancelMode={false}
        setCancelMode={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /in vé/i }));

    await waitFor(() => {
      expect(mocks.invalidateQueries).toHaveBeenCalled();
    });
    expect(setSelectedSeats).not.toHaveBeenCalledWith([]);

    resolveRefresh();

    await waitFor(() => {
      expect(setSelectedSeats).toHaveBeenCalledWith([]);
    });
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
      expect(mocks.updateOrderMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 100,
          dto: expect.objectContaining({
            orderStatusId: OrderStatus.FAIL,
            planScreenId: 1
          })
        }),
        expect.any(Object)
      );
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

  it("opens the invoice dialog after a QR payment succeeds when invoice export is selected", async () => {
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
          id: 102,
          orderTotal: 100000,
          orderDiscount: 0,
          createdOnUtc: "2026-03-16T10:00:00.000Z"
        });
      }
    );
    mocks.createQrMutateAsync.mockResolvedValue({
      qrcode: "vietqr://payload",
      referenceLabelCode: "REF-102",
      accountName: "NCC",
      accountNumber: "123456789",
      accountBankName: "VietinBank"
    });

    renderWithProviders(
      <Actions
        data={createPlanScreening()}
        planScreenId={33}
        selectedSeats={[createSeat()]}
        setSelectedSeats={vi.fn()}
        cancelMode={false}
        setCancelMode={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText("Xuất hóa đơn"));
    fireEvent.click(screen.getByLabelText("Quét VietQR"));
    fireEvent.click(screen.getByRole("button", { name: /in vé/i }));

    await waitFor(() => {
      expect(screen.getByTestId("qr-dialog")).toBeInTheDocument();
    });

    await act(async () => {
      paymentUpdatedHandler?.({ paymentStatus: 30, orderId: "102" });
    });

    await waitFor(() => {
      expect(screen.queryByTestId("qr-dialog")).not.toBeInTheDocument();
      expect(screen.getByTestId("invoice-dialog")).toHaveTextContent("Invoice order 102");
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
    expect(screen.getByRole("button", { name: /hủy giữ/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /in vé/i })).toBeDisabled();
  });

  it("disables order actions while selected seats are awaiting ownership confirmation", () => {
    renderWithProviders(
      <Actions
        data={createPlanScreening()}
        planScreenId={1}
        selectedSeats={[createSeat()]}
        setSelectedSeats={vi.fn()}
        cancelMode={false}
        setCancelMode={vi.fn()}
        isSeatSelectionPending
      />
    );

    const holdButton = screen.getByRole("button", { name: /giữ chỗ/i });
    const printButton = screen.getByRole("button", { name: /in vé/i });

    expect(holdButton).toBeDisabled();
    expect(printButton).toBeDisabled();
    expect(holdButton).toHaveAttribute("aria-busy", "true");
    expect(printButton).toHaveAttribute("aria-busy", "true");
    expect(holdButton).not.toHaveClass("ant-btn-loading");
    expect(printButton).not.toHaveClass("ant-btn-loading");
  });

  it("does not create an order when final seat ownership verification fails", async () => {
    const verifySelectedSeats = vi.fn().mockResolvedValue(false);

    renderWithProviders(
      <Actions
        data={createPlanScreening()}
        planScreenId={1}
        selectedSeats={[createSeat()]}
        setSelectedSeats={vi.fn()}
        cancelMode={false}
        setCancelMode={vi.fn()}
        verifySelectedSeats={verifySelectedSeats}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /in vé/i }));

    await waitFor(() => {
      expect(verifySelectedSeats).toHaveBeenCalledTimes(1);
    });
    expect(mocks.createOrderMutate).not.toHaveBeenCalled();
  });

  it("keeps only the cancel ticket action enabled in cancel mode", () => {
    renderWithProviders(
      <Actions
        data={createPlanScreening()}
        planScreenId={1}
        selectedSeats={[createSeat({ status: 1 })]}
        setSelectedSeats={vi.fn()}
        cancelMode
        setCancelMode={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /^hủy vé$/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /giữ chỗ/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /hủy giữ/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /in vé/i })).toBeDisabled();
    expect(screen.getByLabelText("Xuất hóa đơn")).toBeDisabled();
    expect(screen.getByLabelText("Quẹt thẻ VIP")).toBeDisabled();
    expect(screen.getByLabelText("Quét VietQR")).toBeDisabled();
    expect(screen.getByLabelText("Quét VNPayQR")).toBeDisabled();
  });

  it("resets the cancel reason when the cancel ticket modal is closed", async () => {
    renderWithProviders(
      <Actions
        data={createPlanScreening()}
        planScreenId={1}
        selectedSeats={[createSeat({ status: 1 })]}
        setSelectedSeats={vi.fn()}
        cancelMode
        setCancelMode={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /^hủy vé$/i }));
    fireEvent.mouseDown(screen.getByRole("combobox"));
    fireEvent.click(await screen.findByText("Khach doi y"));
    fireEvent.click(screen.getByRole("button", { name: /quay lại/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /^hủy vé$/i }));
    fireEvent.click(screen.getByRole("button", { name: /hủy toàn bộ đơn/i }));

    await waitFor(() => {
      expect(screen.getByText("Chọn lý do hủy vé")).toBeInTheDocument();
    });
    expect(mocks.cancelOrderMutate).not.toHaveBeenCalled();
  });

  it("shows the complete order and submits its order id when cancelling tickets", async () => {
    const seats = [
      createSeat({ seat: "1", code: "A1", status: 1 }),
      createSeat({ seat: "2", code: "A2", status: 1 })
    ];

    renderWithProviders(
      <Actions
        data={createPlanScreening()}
        planScreenId={1}
        selectedSeats={seats}
        setSelectedSeats={vi.fn()}
        cancelMode
        setCancelMode={vi.fn()}
        cancelOrderSelection={{
          orderId: 456,
          directSeatKey: "1-2",
          seats,
          seatKeys: ["1-1", "1-2"],
          isComplete: true,
          startedOrderStatusId: OrderStatus.COMPLETED
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /^hủy vé$/i }));
    expect(screen.getByRole("dialog", { name: /hủy toàn bộ đơn vé/i })).toHaveTextContent("A1, A2");

    fireEvent.mouseDown(screen.getByRole("combobox"));
    fireEvent.click(await screen.findByText("Khach doi y"));
    fireEvent.click(screen.getByRole("button", { name: /hủy toàn bộ đơn/i }));

    await waitFor(() => {
      expect(mocks.cancelOrderMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          planScreenId: 1,
          orderIds: [456],
          listChairIndexF1: ["1", "2"]
        }),
        expect.any(Object)
      );
    });
  });

  describe("O-8: the order changes while the cancel dialog is open", () => {
    const seats = [
      createSeat({ seat: "1", code: "A1", status: 1 }),
      createSeat({ seat: "2", code: "A2", status: 1 })
    ];
    const startedOnWaitingOrder = {
      orderId: 456,
      directSeatKey: "1-2",
      seats,
      seatKeys: ["1-1", "1-2"],
      isComplete: true,
      startedOrderStatusId: 10
    };
    const confirmCancel = async (
      overrides: {
        setSelectedSeats?: ReturnType<typeof vi.fn>;
        onClear?: ReturnType<typeof vi.fn>;
      } = {}
    ) => {
      renderWithProviders(
        <Actions
          data={createPlanScreening()}
          planScreenId={1}
          selectedSeats={seats}
          setSelectedSeats={overrides.setSelectedSeats ?? vi.fn()}
          cancelMode
          setCancelMode={vi.fn()}
          cancelOrderSelection={startedOnWaitingOrder}
          onCancelOrderSelectionClear={overrides.onClear ?? vi.fn()}
        />
      );
      fireEvent.click(screen.getByRole("button", { name: /^hủy vé$/i }));
      fireEvent.mouseDown(screen.getByRole("combobox"));
      fireEvent.click(await screen.findByText("Khach doi y"));
      fireEvent.click(screen.getByRole("button", { name: /hủy toàn bộ đơn/i }));
    };

    it("sends the status the cashier started the cancel on (not a refetched one)", async () => {
      await confirmCancel();

      await waitFor(() =>
        expect(mocks.cancelOrderMutate).toHaveBeenCalledWith(
          expect.objectContaining({ orderIds: [456], expectedOrderStatusId: 10 }),
          expect.any(Object)
        )
      );
    });

    it("409 paid meanwhile: no success, no resend, refreshes the order, guides the cashier, clears the cancel", async () => {
      const mockSetSelectedSeats = vi.fn();
      const mockClear = vi.fn();
      mocks.cancelOrderMutate.mockImplementation(
        (_body, options: { onError: (error: unknown) => void }) =>
          options.onError(
            createApiError(409, {
              statusCode: 409,
              code: "PAPER_VOUCHER_QR_PAYMENT_RECEIVED",
              message: "Đơn 456 vừa được thanh toán QR trong lúc hủy nên chưa bị hủy."
            })
          )
      );
      mocks.getOrderDetail.mockResolvedValue({
        order: { id: 456, orderStatusId: 30, paymentStatusId: 30, orderPaymentTransactions: [] }
      });

      await confirmCancel({ setSelectedSeats: mockSetSelectedSeats, onClear: mockClear });

      await waitFor(() =>
        expect(mocks.messageWarning).toHaveBeenCalledWith(
          expect.objectContaining({ content: expect.stringContaining("in lại vé") })
        )
      );
      expect(mocks.getOrderDetail).toHaveBeenCalledWith(456);
      expect(mocks.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ordersKeys.getOrdersByScreening(1)
      });
      expect(mocks.cancelOrderMutate).toHaveBeenCalledTimes(1);
      expect(mocks.messageSuccess).not.toHaveBeenCalled();
      expect(mocks.messageError).not.toHaveBeenCalled();
      expect(mockSetSelectedSeats).toHaveBeenCalledWith([]);
      expect(mockClear).toHaveBeenCalled();
    });

    it("any other cancel error keeps the plain error message", async () => {
      mocks.cancelOrderMutate.mockImplementation(
        (_body, options: { onError: (error: unknown) => void }) =>
          options.onError(
            createApiError(400, { statusCode: 400, message: "Đơn hàng 456 đã được hủy trước đó" })
          )
      );

      await confirmCancel();

      await waitFor(() =>
        expect(mocks.messageError).toHaveBeenCalledWith("Đơn hàng 456 đã được hủy trước đó")
      );
      expect(mocks.messageWarning).not.toHaveBeenCalled();
    });
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

    fireEvent.click(screen.getByRole("button", { name: /hủy giữ/i }));

    await waitFor(() => {
      expect(mocks.cancelReserve).toHaveBeenCalledWith({
        listChairIndexF1: ["1", "2"],
        listChairIndexF2: [],
        listChairIndexF3: [],
        orderIds: [201, 202]
      });
      expect(mocks.messageSuccess).toHaveBeenCalledWith("Hủy giữ chỗ thành công");
    });
  });
});

const twoSeats = [createSeat(), createSeat({ seat: "2", code: "A2", price: 90000 })];

const renderPaperVoucherActions = (selectedSeats: ListSeat[] = twoSeats) => {
  const props = {
    data: createPlanScreening(),
    planScreenId: 1,
    setSelectedSeats: vi.fn(),
    cancelMode: false,
    setCancelMode: vi.fn()
  };
  const view = renderWithProviders(<Actions {...props} selectedSeats={selectedSeats} />);
  const rerenderSeats = (seats: ListSeat[]) =>
    view.rerender(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <Actions {...props} selectedSeats={seats} />
        </MemoryRouter>
      </QueryClientProvider>
    );

  return { ...view, rerenderSeats };
};

const applyVouchers = async (batchCodes: string[]) => {
  fireEvent.click(screen.getByText("Voucher giấy").closest("button")!);
  for (const batchCode of batchCodes) {
    const option = await screen.findByTestId(`paper-voucher-option-${batchCode}`);
    fireEvent.click(within(option).getByText("Chọn").closest("button")!);
  }
  fireEvent.click(screen.getByText("Áp dụng").closest("button")!);
  await waitFor(() => expect(screen.queryByText("Áp dụng voucher giấy")).not.toBeInTheDocument());
};

/** Phần voucher đang áp dụng (báo giá) nằm trong popup Voucher giấy, không ở footer. */
const openVoucherSummary = () => {
  fireEvent.click(screen.getByText("Voucher giấy").closest("button")!);
  return screen.findByTestId("paper-voucher-pos-summary");
};

/** Chi tiết voucher giấy của lần bán gần nhất nằm trong tooltip của "Tiền vừa bán". */
const showLastSaleDetail = async () => {
  fireEvent.mouseEnter(screen.getByTestId("last-sale-total"));
  await screen.findByTestId("last-sale-paper-voucher");
};

// Test voucher giấy mở dialog antd và chờ báo giá: khi chạy song song toàn bộ test có thể chậm hơn
// mặc định 5 s, nên các test bên dưới đặt timeout 30 s.
const getPrintButton = () => screen.getByRole("button", { name: /in vé/i });

describe("Actions paper vouchers (selection)", () => {
  let paperVoucherServer: Awaited<ReturnType<typeof setupPaperVoucherServer>>;

  beforeEach(async () => {
    paperVoucherServer = await setupPaperVoucherServer();
    stubObjectUrls();
    mocks.createOrderMutate.mockReset();
    mocks.messageSuccess.mockReset();
    mocks.messageError.mockReset();
    mocks.modalConfirm.mockReset();
    useSettingPosStore.setState({ posName: "POS Machine 1", posShortName: "M11" });
  });

  it("always sends selected batches to the paper voucher POS quote, never as a plain order", async () => {
    mocks.quoteOrder.mockReturnValue(new Promise(() => {}));
    renderPaperVoucherActions();

    await applyVouchers(["LÔ-003", "LÔ-004"]);
    // Footer không có dòng voucher giấy riêng; xem trong popup.
    expect(screen.queryByTestId("paper-voucher-pos-summary")).not.toBeInTheDocument();
    const summary = await openVoucherSummary();

    expect(screen.getByLabelText("Số lượng LÔ-003")).toHaveValue("1");
    expect(screen.getByLabelText("Số lượng LÔ-004")).toHaveValue("1");
    expect(summary).toHaveTextContent("Khách cần trả thêm");
    expect(within(summary).queryByText("Chưa ghi nhận vào đơn")).not.toBeInTheDocument();
    await waitFor(() => expect(mocks.quoteOrder).toHaveBeenCalledTimes(1), { timeout: 10000 });
    expect(mocks.quoteOrder.mock.calls[0][0].paperVouchers).toEqual([
      expect.objectContaining({ batchId: 3, quantity: 1 }),
      expect.objectContaining({ batchId: 4, quantity: 1 })
    ]);
    expect(getPrintButton()).toBeDisabled();

    fireEvent.click(getPrintButton());
    expect(mocks.createOrderMutate).not.toHaveBeenCalled();
    expect(paperVoucherServer.requestBodies).toEqual([]);

    fireEvent.click(screen.getByText("Bỏ áp dụng").closest("button")!);
    // Bỏ áp dụng đóng luôn popup.
    expect(screen.queryByText("Áp dụng voucher giấy")).not.toBeInTheDocument();
    expect(screen.queryByTestId("paper-voucher-pos-summary")).not.toBeInTheDocument();
    expect(getPrintButton()).toBeEnabled();
  }, 30000);

  it("quotes the selection while choosing, before Áp dụng, and keeps nothing on Hủy", async () => {
    mocks.quoteOrder.mockResolvedValue(createQuote());
    renderPaperVoucherActions();

    fireEvent.click(screen.getByText("Voucher giấy").closest("button")!);
    const option = await screen.findByTestId("paper-voucher-option-LÔ-003");
    fireEvent.click(within(option).getByText("Chọn").closest("button")!);

    // Chưa bấm Áp dụng đã thấy số tiền khách cần trả thêm theo báo giá backend.
    const summary = await screen.findByTestId("paper-voucher-pos-summary");
    await within(summary).findByTestId("paper-voucher-remaining", {}, { timeout: 10000 });
    expect(mocks.quoteOrder.mock.calls[0][0].paperVouchers).toEqual([
      expect.objectContaining({ batchId: 3, quantity: 1 })
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Hủy" }));
    await waitFor(() => expect(screen.queryByText("Áp dụng voucher giấy")).not.toBeInTheDocument());
    expect(screen.getByText("Voucher giấy").closest(".ant-badge")).not.toHaveTextContent(/\d/);
    expect(getPrintButton()).toBeEnabled();
  }, 30000);

  it("does not cap vouchers by the seat count and clears them when no seat is left", async () => {
    const { rerenderSeats } = renderPaperVoucherActions();
    await applyVouchers(["LÔ-003", "LÔ-004"]);

    rerenderSeats([createSeat()]);
    await openVoucherSummary();
    expect(await screen.findByLabelText("Số lượng LÔ-004")).toHaveValue("1");
    expect(screen.queryByTestId("paper-voucher-selection-error")).toBeNull();

    rerenderSeats([]);
    await waitFor(() =>
      expect(screen.queryByTestId("paper-voucher-pos-summary")).not.toBeInTheDocument()
    );
  });

  it("hides the paper voucher action when the screening has passed", () => {
    renderWithProviders(
      <Actions
        data={{
          ...createPlanScreening(),
          projectDate: "2026-03-16",
          projectTime: "2026-03-16T00:00:00.000Z"
        }}
        planScreenId={1}
        selectedSeats={twoSeats}
        setSelectedSeats={vi.fn()}
        cancelMode={false}
        setCancelMode={vi.fn()}
      />
    );

    expect(screen.queryByText("Voucher giấy")).not.toBeInTheDocument();
  });
});

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Lô 80.000đ đang áp dụng (ngày nghiệp vụ test 2026-10-30), thêm vào dữ liệu lô mặc định. */
const BATCH_80K: PaperVoucherBatch = {
  id: 5,
  batchCode: "LÔ-005",
  name: "Voucher giấy 80.000đ - 2026",
  faceValue: 80000,
  totalQuantity: 100,
  usedCount: 0,
  validFrom: "2026-01-01",
  expiresAt: "2026-12-31",
  isLocked: false,
  note: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

const createQuoteLine = (
  overrides: Partial<PaperVoucherQuoteLine> = {}
): PaperVoucherQuoteLine => ({
  batchId: 5,
  batchCode: "LÔ-005",
  quantity: 1,
  faceValue: 80000,
  faceValueTotal: 80000,
  appliedAmount: 80000,
  excessAmount: 0,
  ...overrides
});

/** Báo giá rev 7 mặc định: vé 100.000đ, voucher 80.000đ trả 80.000đ, khách trả thêm 20.000đ. */
const createQuote = (overrides: Partial<PaperVoucherOrderQuote> = {}): PaperVoucherOrderQuote => ({
  businessDate: "2026-10-30",
  orderTotal: 100000,
  orderDiscount: 0,
  voucherQuantity: 1,
  faceValueTotal: 80000,
  voucherApplied: 80000,
  remainingPayable: 20000,
  excessAmount: 0,
  lines: [createQuoteLine()],
  allowedPaymentMethods: ["POS"],
  warnings: [],
  quoteHash: "a".repeat(64),
  ...overrides
});

/** `paperVoucher` của response tạo đơn tương ứng báo giá. */
const createOrderPaperVoucher = (
  quote: PaperVoucherOrderQuote,
  overrides: Partial<OrderPaperVoucherResult> = {}
): OrderPaperVoucherResult => ({
  redemptionId: 1,
  requestId: "6f1c2a8e-1d2b-4c3d-8e4f-5a6b7c8d9e0f",
  status: "applied",
  paymentMethodSystemName: "POS",
  orderTotal: quote.orderTotal,
  voucherQuantity: quote.voucherQuantity,
  faceValueTotal: quote.faceValueTotal,
  voucherApplied: quote.voucherApplied,
  remainingPayable: quote.remainingPayable,
  excessAmount: quote.excessAmount,
  collectedAmount: quote.remainingPayable,
  replayed: false,
  ...overrides
});

/** Lỗi Axios như backend trả về; không truyền `status` = mất mạng (không có response). */
const createApiError = (status?: number, data?: unknown) => {
  const config = { headers: new AxiosHeaders() };
  const response =
    status === undefined
      ? undefined
      : ({ status, statusText: "", headers: {}, config, data } as AxiosResponse);

  return new AxiosError(
    status === undefined ? "Network Error" : "Request failed",
    status === undefined ? AxiosError.ERR_NETWORK : AxiosError.ERR_BAD_REQUEST,
    config,
    undefined,
    response
  );
};

type CreateOrderOptions = {
  onSuccess: (order: Record<string, unknown>) => Promise<void>;
  onError: (error: unknown) => void;
};

const submittedOrders = () => mocks.createOrderMutate.mock.calls.map(([body]) => body as OrderDto);

const textOf = (testId: string) => screen.getByTestId(testId).textContent?.replace(/\s/g, "");
const money = (amount: number) => formatMoney(amount).replace(/\s/g, "");

// Báo giá chạy sau debounce 300 ms; jsdom render antd chậm (nhất là khi chạy song song toàn bộ
// test) nên chờ lâu hơn mặc định 1 s. `waitFor` trả về ngay khi điều kiện đúng.
const QUOTE_WAIT = { timeout: 10000 };
const waitForQuote = (assertion: () => void) => waitFor(assertion, QUOTE_WAIT);

const oneSeat = [createSeat()];

describe("Actions paper voucher sale", () => {
  beforeEach(async () => {
    await setupPaperVoucherServer({ batches: [...PAPER_VOUCHER_FIXTURES, BATCH_80K] });
    stubObjectUrls();
    useSettingPosStore.setState({ posName: "POS Machine 1", posShortName: "M11" });
  });

  it("does not quote nor change the sale when no paper voucher is selected", async () => {
    mocks.createOrderMutate.mockImplementation((_body: OrderDto, options: CreateOrderOptions) =>
      options.onSuccess({ id: 130, orderTotal: 100000, orderDiscount: 0 })
    );
    renderPaperVoucherActions(oneSeat);

    expect(textOf("order-final-amount")).toBe(money(100000));
    fireEvent.click(getPrintButton());

    await waitFor(() => expect(mocks.createOrderMutate).toHaveBeenCalledTimes(1));
    expect(submittedOrders()[0]).not.toHaveProperty("paperVouchers");
    expect(submittedOrders()[0]).not.toHaveProperty("expectedRemainingPayable");
    await waitFor(() => expect(sessionStorage.getItem("lastTotal")).toBe("100000"));
    expect(screen.queryByTestId("last-sale-paper-voucher")).not.toBeInTheDocument();
    expect(screen.queryByTestId("last-sale-collected")).not.toBeInTheDocument();
    expect(mocks.quoteOrder).not.toHaveBeenCalled();
  });

  it("ignores the voucher part of a last sale cleared by another screen", () => {
    sessionStorage.setItem("lastPaperVoucher", "80000");
    sessionStorage.setItem("lastPaperVoucherCollected", "20000");
    renderPaperVoucherActions(oneSeat);

    expect(screen.queryByTestId("last-sale-paper-voucher")).not.toBeInTheDocument();
    expect(screen.queryByTestId("last-sale-collected")).not.toBeInTheDocument();
  });

  it("100.000đ ticket, 80.000đ voucher: customer pays 20.000đ cash, ticket total stays", async () => {
    const quote = createQuote();
    mocks.quoteOrder.mockResolvedValue(quote);
    mocks.createOrderMutate.mockImplementation((_body: OrderDto, options: CreateOrderOptions) =>
      options.onSuccess({
        id: 131,
        orderTotal: 100000,
        orderDiscount: 0,
        orderStatusId: OrderStatus.COMPLETED,
        paperVoucher: createOrderPaperVoucher(quote)
      })
    );
    renderPaperVoucherActions(oneSeat);

    await applyVouchers(["LÔ-005"]);
    const summary = await openVoucherSummary();
    expect(within(summary).getByTestId("paper-voucher-quote-loading")).toBeInTheDocument();
    expect(getPrintButton()).toBeDisabled();

    await within(summary).findByTestId("paper-voucher-remaining", {}, QUOTE_WAIT);
    expect(mocks.quoteOrder).toHaveBeenCalledTimes(1);
    expect(mocks.quoteOrder).toHaveBeenCalledWith(
      {
        planScreenId: 1,
        floorNo: 1,
        paymentMethodSystemName: "POS",
        posName: "POS Machine 1",
        posShortName: "M11",
        isInvitation: false,
        hasManualInvoice: false,
        listChairIndexF1: "1",
        listChairValueF1: "A1",
        paperVouchers: [{ batchId: 5, quantity: 1, faceValue: 80000 }]
      },
      expect.anything()
    );
    expect(summary).toHaveTextContent("Khách cần trả thêm");
    expect(textOf("paper-voucher-order-total")).toBe(money(100000));
    expect(textOf("paper-voucher-applied")).toBe(`−${money(80000)}`);
    expect(textOf("paper-voucher-remaining")).toBe(money(20000));
    expect(textOf("paper-voucher-payment-method")).toBe("Tiềnmặt");
    expect(screen.queryByTestId("paper-voucher-excess-warning")).not.toBeInTheDocument();
    // "Thành tiền" là số tiền khách phải trả: tổng tiền vé trừ phần voucher giấy.
    expect(textOf("order-final-amount")).toBe(money(20000));
    expect(getPrintButton()).toBeEnabled();

    fireEvent.click(getPrintButton());
    await waitFor(() => expect(mocks.createOrderMutate).toHaveBeenCalledTimes(1));
    expect(submittedOrders()[0]).toMatchObject({
      paymentMethodSystemName: "POS",
      paperVouchers: [{ batchId: 5, quantity: 1, faceValue: 80000 }],
      paperVoucherQuoteHash: "a".repeat(64),
      expectedRemainingPayable: 20000
    });
    expect(submittedOrders()[0].paperVoucherRequestId).toMatch(UUID_V4);
    expect(submittedOrders()[0]).not.toHaveProperty("expectedFinalOrderTotal");
    expect(mocks.createQrMutateAsync).not.toHaveBeenCalled();

    // Tiền vừa bán = tổng đơn (doanh số giữ nguyên); kèm phần voucher và tiền mặt khách trả thêm.
    await waitFor(() => expect(sessionStorage.getItem("lastTotal")).toBe("100000"));
    await showLastSaleDetail();
    expect(textOf("last-sale-paper-voucher")).toBe(`Vouchergiấy:${money(80000)}`);
    expect(textOf("last-sale-collected")).toBe(`Kháchtrảthêm:${money(20000)}`);
    expect(sessionStorage.getItem("lastPaperVoucherCollected")).toBe("20000");
    await waitFor(() =>
      expect(screen.queryByTestId("paper-voucher-pos-summary")).not.toBeInTheDocument()
    );
    expect(mocks.messageSuccess).toHaveBeenCalledWith("Tạo đơn thành công");
  }, 30000);

  it("100.000đ ticket, 100.000đ voucher: fully paid by voucher, cash only", async () => {
    mocks.quoteOrder.mockResolvedValue(
      createQuote({
        faceValueTotal: 100000,
        voucherApplied: 100000,
        remainingPayable: 0,
        lines: [
          createQuoteLine({
            batchId: 3,
            batchCode: "LÔ-003",
            faceValue: 100000,
            faceValueTotal: 100000,
            appliedAmount: 100000
          })
        ],
        warnings: [
          { code: "PAPER_VOUCHER_FULLY_PAID", message: "Voucher giấy đã thanh toán đủ đơn" }
        ]
      })
    );
    renderPaperVoucherActions(oneSeat);

    await applyVouchers(["LÔ-003"]);
    const summary = await openVoucherSummary();
    await waitForQuote(() => expect(getPrintButton()).toBeEnabled());

    expect(textOf("paper-voucher-remaining")).toBe(money(0));
    expect(within(summary).getByText("Đã thanh toán đủ")).toBeInTheDocument();
    expect(screen.queryByTestId("paper-voucher-quote-warning")).not.toBeInTheDocument();
    expect(textOf("order-final-amount")).toBe(money(0));
    expect(screen.getByLabelText("Quét VietQR")).toBeDisabled();
    expect(screen.getByLabelText("Quét VNPayQR")).toBeDisabled();

    fireEvent.click(getPrintButton());
    await waitFor(() => expect(mocks.createOrderMutate).toHaveBeenCalledTimes(1));
    expect(submittedOrders()[0]).toMatchObject({
      paymentMethodSystemName: "POS",
      expectedRemainingPayable: 0
    });
  }, 30000);

  it("100.000đ ticket, 200.000đ vouchers: warns that the excess is not refunded", async () => {
    mocks.quoteOrder.mockResolvedValue(
      createQuote({
        voucherQuantity: 2,
        faceValueTotal: 200000,
        voucherApplied: 100000,
        remainingPayable: 0,
        excessAmount: 100000,
        lines: [
          createQuoteLine({
            batchId: 3,
            batchCode: "LÔ-003",
            quantity: 2,
            faceValue: 100000,
            faceValueTotal: 200000,
            appliedAmount: 100000,
            excessAmount: 100000
          })
        ],
        warnings: [
          { code: "PAPER_VOUCHER_EXCESS", message: "Tổng mệnh giá vượt giá trị đơn 100.000đ" },
          { code: "PAPER_VOUCHER_FULLY_PAID", message: "Voucher giấy đã thanh toán đủ đơn" }
        ]
      })
    );
    renderPaperVoucherActions(oneSeat);

    await applyVouchers(["LÔ-003"]);
    await waitForQuote(() => expect(getPrintButton()).toBeEnabled());
    await openVoucherSummary();

    expect(textOf("paper-voucher-excess-warning")).toBe(`Tiềnthừa${money(100000)}khônghoànlại`);
    expect(textOf("paper-voucher-excess")).toBe(money(100000));
    expect(textOf("paper-voucher-face-value-total")).toBe(money(200000));
    expect(textOf("paper-voucher-order-total")).toBe(money(100000));
    expect(textOf("paper-voucher-applied")).toBe(`−${money(100000)}`);
    expect(textOf("paper-voucher-remaining")).toBe(money(0));
    // Cảnh báo backend trùng nội dung đã hiển thị thì không lặp lại.
    expect(screen.queryByTestId("paper-voucher-quote-warning")).not.toBeInTheDocument();
  }, 30000);

  it("190.000đ for two tickets, 80.000đ voucher: 110.000đ remaining, no multi-ticket block", async () => {
    mocks.quoteOrder.mockResolvedValue(
      createQuote({ orderTotal: 190000, voucherApplied: 80000, remainingPayable: 110000 })
    );
    renderPaperVoucherActions(twoSeats);

    await applyVouchers(["LÔ-005"]);
    await waitForQuote(() => expect(getPrintButton()).toBeEnabled());
    await openVoucherSummary();

    expect(textOf("paper-voucher-order-total")).toBe(money(190000));
    expect(textOf("paper-voucher-applied")).toBe(`−${money(80000)}`);
    expect(textOf("paper-voucher-remaining")).toBe(money(110000));
    expect(textOf("order-final-amount")).toBe(money(110000));
    expect(screen.queryByTestId("paper-voucher-quote-error")).not.toBeInTheDocument();

    fireEvent.click(getPrintButton());
    await waitFor(() => expect(mocks.createOrderMutate).toHaveBeenCalledTimes(1));
    expect(submittedOrders()[0]).toMatchObject({
      listChairIndexF1: "1,2",
      expectedRemainingPayable: 110000
    });
  }, 30000);

  it("offers VietQR only when allowed and charges the QR with the remaining amount", async () => {
    const quote = createQuote({ allowedPaymentMethods: ["POS", PaymentType.VIETQR] });
    const setSelectedSeats = vi.fn();
    mocks.quoteOrder.mockResolvedValue(quote);
    mocks.createOrderMutate.mockImplementation((_body: OrderDto, options: CreateOrderOptions) =>
      options.onSuccess({
        id: 140,
        orderTotal: 100000,
        orderDiscount: 0,
        orderStatusId: OrderStatus.PENDING,
        paymentStatusId: 10,
        shippingStatusId: 0,
        paymentMethodSystemName: PaymentType.VIETQR,
        createdOnUtc: "2026-10-30T10:00:00.000Z",
        paperVoucher: createOrderPaperVoucher(quote, {
          status: "held",
          paymentMethodSystemName: PaymentType.VIETQR,
          collectedAmount: null
        })
      })
    );
    mocks.createQrMutateAsync.mockResolvedValue({
      qrcode: "vietqr://payload",
      referenceLabelCode: "REF-140",
      accountName: "NCC",
      accountNumber: "123456789",
      accountBankName: "VietinBank",
      transactionAmount: 20000,
      paperVoucher: { orderTotal: 100000, voucherApplied: 80000, remainingPayable: 20000 }
    });
    renderWithProviders(
      <Actions
        data={createPlanScreening()}
        planScreenId={1}
        selectedSeats={oneSeat}
        setSelectedSeats={setSelectedSeats}
        cancelMode={false}
        setCancelMode={vi.fn()}
      />
    );

    await applyVouchers(["LÔ-005"]);
    await waitForQuote(() => expect(getPrintButton()).toBeEnabled());
    expect(screen.getByLabelText("Quét VietQR")).toBeEnabled();
    expect(screen.getByLabelText("Quét VNPayQR")).toBeDisabled();

    fireEvent.click(screen.getByLabelText("Quét VietQR"));
    await openVoucherSummary();
    expect(textOf("paper-voucher-payment-method")).toBe("QuétVietQR");
    // Đổi phương thức không báo giá lại.
    expect(mocks.quoteOrder).toHaveBeenCalledTimes(1);

    fireEvent.click(getPrintButton());
    await waitFor(() => expect(mocks.createQrMutateAsync).toHaveBeenCalledTimes(1));
    expect(submittedOrders()[0]).toMatchObject({
      paymentMethodSystemName: PaymentType.VIETQR,
      expectedRemainingPayable: 20000
    });
    expect(mocks.createQrMutateAsync).toHaveBeenCalledWith({
      orderId: 140,
      paymentMethod: PaymentType.VIETQR,
      shortName: "M11"
    });
    await waitFor(() => expect(screen.getByTestId("qr-dialog")).toBeInTheDocument());
    expect(window.api.sendQrOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 140,
        orderTotal: 100000,
        transactionAmount: 20000,
        paperVoucher: {
          orderTotal: 100000,
          voucherApplied: 80000,
          remainingPayable: 20000,
          lines: [{ batchCode: "LÔ-005", quantity: 1 }]
        }
      })
    );

    // QR còn chờ thanh toán (kể cả sự kiện trạng thái khác PAID): chưa là lần bán đã thanh toán.
    await act(async () => {
      paymentUpdatedHandler?.({ paymentStatus: 10, orderId: "140" });
    });
    expect(screen.getByTestId("qr-dialog")).toBeInTheDocument();
    expect(sessionStorage.getItem("lastTotal")).toBeNull();
    expect(screen.queryByTestId("last-sale-paper-voucher")).not.toBeInTheDocument();
    expect(screen.queryByTestId("last-sale-collected")).not.toBeInTheDocument();

    await act(async () => {
      paymentUpdatedHandler?.({ paymentStatus: 30, orderId: "140" });
    });

    await waitFor(() => expect(screen.queryByTestId("qr-dialog")).not.toBeInTheDocument());
    // Tiền vừa bán = tổng đơn 100.000đ (doanh số, như đơn thường); kèm phần voucher và số QR đã
    // nhận 20.000đ, không đánh tráo hai số. Lựa chọn voucher được xóa.
    expect(sessionStorage.getItem("lastTotal")).toBe("100000");
    await showLastSaleDetail();
    expect(textOf("last-sale-paper-voucher")).toBe(`Vouchergiấy:${money(80000)}`);
    expect(textOf("last-sale-collected")).toBe(`Kháchtrảthêm:${money(20000)}`);
    expect(screen.queryByTestId("paper-voucher-pos-summary")).not.toBeInTheDocument();
    expect(setSelectedSeats).toHaveBeenCalledWith([]);
  }, 30000);

  it("falls back to cash visibly when the selected payment method is not allowed", async () => {
    let resolveQuote: (quote: PaperVoucherOrderQuote) => void = () => undefined;
    mocks.quoteOrder.mockReturnValue(
      new Promise<PaperVoucherOrderQuote>((resolve) => {
        resolveQuote = resolve;
      })
    );
    renderPaperVoucherActions(oneSeat);

    fireEvent.click(screen.getByLabelText("Quét VNPayQR"));
    await applyVouchers(["LÔ-005"]);

    // Đang báo giá: VNPayQR/VietQR vẫn chọn được, chỉ báo giá của backend quyết định.
    expect(screen.getByLabelText("Quét VNPayQR")).toBeChecked();
    expect(mocks.messageWarning).not.toHaveBeenCalled();

    // Báo giá không cho phép phương thức đang chọn thì chuyển về tiền mặt.
    fireEvent.click(screen.getByLabelText("Quét VietQR"));
    expect(screen.getByLabelText("Quét VietQR")).toBeChecked();
    await act(async () => resolveQuote(createQuote()));

    await waitForQuote(() => expect(screen.getByLabelText("Quét VietQR")).not.toBeChecked());
    expect(screen.getByLabelText("Quét VietQR")).toBeDisabled();
    expect(screen.getByLabelText("Quét VNPayQR")).toBeDisabled();
    expect(mocks.messageWarning).toHaveBeenLastCalledWith(
      "Quét VietQR không dùng được cho đơn có voucher giấy này. Đã chuyển sang tiền mặt."
    );
    await openVoucherSummary();
    expect(textOf("paper-voucher-payment-method")).toBe("Tiềnmặt");
    expect(mocks.createOrderMutate).not.toHaveBeenCalled();
  }, 30000);

  it("blocks seat reservation while vouchers are selected", async () => {
    mocks.quoteOrder.mockResolvedValue(createQuote());
    renderPaperVoucherActions(oneSeat);

    await applyVouchers(["LÔ-005"]);
    await openVoucherSummary();
    expect(screen.getByRole("button", { name: /giữ chỗ/i })).toBeDisabled();

    fireEvent.click(screen.getByText("Bỏ áp dụng").closest("button")!);
    expect(screen.getByRole("button", { name: /giữ chỗ/i })).toBeEnabled();
    expect(screen.getByLabelText("Quét VNPayQR")).toBeEnabled();
    expect(mocks.createOrderMutate).not.toHaveBeenCalled();
  }, 30000);

  it("keeps only In vé disabled while the quote is loading", async () => {
    let resolveQuote: (quote: PaperVoucherOrderQuote) => void = () => undefined;
    mocks.quoteOrder.mockReturnValue(
      new Promise<PaperVoucherOrderQuote>((resolve) => {
        resolveQuote = resolve;
      })
    );
    renderPaperVoucherActions(oneSeat);

    await applyVouchers(["LÔ-005"]);
    const summary = await openVoucherSummary();
    await waitForQuote(() => expect(mocks.quoteOrder).toHaveBeenCalledTimes(1));
    expect(within(summary).getByTestId("paper-voucher-quote-loading")).toBeInTheDocument();
    expect(getPrintButton()).toBeDisabled();
    expect(textOf("order-final-amount")).toBe("--");
    // Các thao tác khác vẫn dùng được trong lúc báo giá.
    expect(screen.getByLabelText("Quẹt thẻ VIP")).toBeEnabled();
    expect(screen.getByLabelText("Quét VietQR")).toBeEnabled();
    expect(screen.getByText("Bỏ áp dụng").closest("button")).toBeEnabled();

    await act(async () => resolveQuote(createQuote()));
    await waitForQuote(() => expect(getPrintButton()).toBeEnabled());
  }, 30000);

  it("shows the backend message when the quote is rejected and lets the cashier retry", async () => {
    mocks.quoteOrder.mockRejectedValueOnce(
      createApiError(400, {
        statusCode: 400,
        code: "PAPER_VOUCHER_ORDER_TOTAL_ZERO",
        message: "Đơn 0 đồng không dùng voucher giấy"
      })
    );
    mocks.quoteOrder.mockResolvedValue(createQuote());
    renderPaperVoucherActions(oneSeat);

    await applyVouchers(["LÔ-005"]);
    const summary = await openVoucherSummary();

    expect(
      await within(summary).findByTestId("paper-voucher-quote-error", {}, QUOTE_WAIT)
    ).toHaveTextContent("Đơn 0 đồng không dùng voucher giấy");
    expect(getPrintButton()).toBeDisabled();

    fireEvent.click(within(summary).getByText("Thử lại").closest("button")!);
    await waitForQuote(() => expect(getPrintButton()).toBeEnabled());
    expect(mocks.quoteOrder).toHaveBeenCalledTimes(2);
  }, 30000);

  it("shows the new amounts of a 409 quote change and requires a new confirmation", async () => {
    const changedQuote = createQuote({
      orderTotal: 110000,
      remainingPayable: 30000,
      quoteHash: "b".repeat(64)
    });
    mocks.quoteOrder.mockResolvedValue(createQuote());
    mocks.createOrderMutate.mockImplementationOnce((_body: OrderDto, options: CreateOrderOptions) =>
      options.onError(
        createApiError(409, {
          statusCode: 409,
          code: "PAPER_VOUCHER_QUOTE_CHANGED",
          message: "Báo giá đã thay đổi",
          details: { quote: changedQuote }
        })
      )
    );
    renderPaperVoucherActions(oneSeat);

    await applyVouchers(["LÔ-005"]);
    await waitForQuote(() => expect(getPrintButton()).toBeEnabled());
    fireEvent.click(getPrintButton());

    await waitFor(() =>
      expect(mocks.messageWarning).toHaveBeenCalledWith(PAPER_VOUCHER_QUOTE_CHANGED_MESSAGE)
    );
    await openVoucherSummary();
    await waitForQuote(() => expect(textOf("paper-voucher-remaining")).toBe(money(30000)));
    expect(textOf("order-final-amount")).toBe(money(30000));
    expect(textOf("paper-voucher-order-total")).toBe(money(110000));
    expect(screen.getByTestId("paper-voucher-quote-replaced")).toBeInTheDocument();
    // Không tự gửi lại đơn với số tiền cũ hay mới.
    expect(mocks.createOrderMutate).toHaveBeenCalledTimes(1);
    expect(mocks.quoteOrder).toHaveBeenCalledTimes(1);

    fireEvent.click(getPrintButton());
    await waitFor(() => expect(mocks.createOrderMutate).toHaveBeenCalledTimes(2));
    const [first, confirmed] = submittedOrders();
    expect(first).toMatchObject({ expectedRemainingPayable: 20000 });
    expect(confirmed).toMatchObject({
      paperVoucherQuoteHash: "b".repeat(64),
      expectedRemainingPayable: 30000
    });
    // Backend không ghi gì khi trả 409 báo giá đổi; payload mới (số tiền mới) đi với mã request mới.
    expect(confirmed.paperVoucherRequestId).toMatch(UUID_V4);
    expect(confirmed.paperVoucherRequestId).not.toBe(first.paperVoucherRequestId);
    expect(mocks.getPaperVoucherRequestStatus).not.toHaveBeenCalled();
  }, 30000);

  it("reuses the request id for network/5xx retries and renews it after a sale", async () => {
    const outcomes: Array<(options: CreateOrderOptions) => void> = [
      (options) => options.onError(createApiError()),
      (options) =>
        options.onError(createApiError(503, { statusCode: 503, message: "Hệ thống đang bận" })),
      (options) =>
        void options.onSuccess({
          id: 120,
          orderTotal: 100000,
          orderDiscount: 0,
          paperVoucher: createOrderPaperVoucher(createQuote())
        })
    ];
    mocks.quoteOrder.mockResolvedValue(createQuote());
    mocks.createOrderMutate.mockImplementation((_body: OrderDto, options: CreateOrderOptions) =>
      outcomes.shift()?.(options)
    );
    renderPaperVoucherActions(oneSeat);

    await applyVouchers(["LÔ-005"]);
    await waitForQuote(() => expect(getPrintButton()).toBeEnabled());

    fireEvent.click(getPrintButton());
    await waitFor(() => expect(mocks.createOrderMutate).toHaveBeenCalledTimes(1));
    expect(mocks.messageError).toHaveBeenLastCalledWith(PAPER_VOUCHER_NETWORK_ERROR_MESSAGE);

    fireEvent.click(getPrintButton());
    await waitFor(() => expect(mocks.createOrderMutate).toHaveBeenCalledTimes(2));
    expect(mocks.messageError).toHaveBeenLastCalledWith("Hệ thống đang bận");

    fireEvent.click(getPrintButton());
    await waitFor(() => expect(mocks.createOrderMutate).toHaveBeenCalledTimes(3));

    const [network, serverError, confirmed] = submittedOrders();
    expect(network.paperVoucherRequestId).toMatch(UUID_V4);
    expect(serverError.paperVoucherRequestId).toBe(network.paperVoucherRequestId);
    expect(confirmed.paperVoucherRequestId).toBe(network.paperVoucherRequestId);

    await waitFor(() =>
      expect(screen.queryByTestId("paper-voucher-pos-summary")).not.toBeInTheDocument()
    );

    // Lần bán tiếp theo (cùng lựa chọn) dùng mã request mới.
    mocks.createOrderMutate.mockImplementation(() => undefined);
    await applyVouchers(["LÔ-005"]);
    await waitForQuote(() => expect(getPrintButton()).toBeEnabled());
    fireEvent.click(getPrintButton());
    await waitFor(() => expect(mocks.createOrderMutate).toHaveBeenCalledTimes(4));
    expect(submittedOrders()[3].paperVoucherRequestId).toMatch(UUID_V4);
    expect(submittedOrders()[3].paperVoucherRequestId).not.toBe(confirmed.paperVoucherRequestId);
  }, 30000);

  /** Lần bán tiền mặt bị mất mạng (chưa biết đã tạo đơn chưa), rồi thu ngân chọn VietQR và bấm In vé. */
  const loseCashResponseThenSwitchToQr = async () => {
    mocks.quoteOrder.mockResolvedValue(
      createQuote({ allowedPaymentMethods: ["POS", PaymentType.VIETQR] })
    );
    mocks.createOrderMutate.mockImplementationOnce((_body: OrderDto, options: CreateOrderOptions) =>
      options.onError(createApiError())
    );
    renderPaperVoucherActions(oneSeat);

    await applyVouchers(["LÔ-005"]);
    await waitForQuote(() => expect(getPrintButton()).toBeEnabled());
    fireEvent.click(getPrintButton());
    await waitFor(() => expect(mocks.createOrderMutate).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByLabelText("Quét VietQR"));
    fireEvent.click(getPrintButton());
    await waitFor(() => expect(mocks.getPaperVoucherRequestStatus).toHaveBeenCalledTimes(1));
    return submittedOrders()[0];
  };

  // Lỗi mạng: không biết đơn tiền mặt đã tạo chưa. Không gửi payload QR với cùng mã, cũng không tạo
  // giao dịch QR mới trước khi tra cứu mã cũ.
  it("does not switch a lost cash sale to QR: it looks the old request up and finds its order", async () => {
    mocks.getPaperVoucherRequestStatus.mockImplementation(async (requestId: string) => ({
      requestId,
      state: "found",
      order: {
        id: 140,
        orderTotal: 100000,
        paymentMethodSystemName: "POS",
        paperVoucher: createOrderPaperVoucher(createQuote(), { requestId, replayed: true })
      }
    }));

    const cash = await loseCashResponseThenSwitchToQr();

    expect(mocks.getPaperVoucherRequestStatus).toHaveBeenCalledWith(cash.paperVoucherRequestId);
    await waitFor(() =>
      expect(mocks.messageWarning).toHaveBeenCalledWith(
        "Lần bán trước đã tạo đơn #140 (đã thanh toán, Tiền mặt). Không tạo đơn mới; kiểm tra đơn này trong lịch sử đơn hàng."
      )
    );
    expect(mocks.createOrderMutate).toHaveBeenCalledTimes(1);
    expect(mocks.createQrMutateAsync).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByTestId("paper-voucher-pos-summary")).not.toBeInTheDocument()
    );
  }, 30000);

  it("starts the QR sale with a new request id only once the lost cash sale is known not recorded", async () => {
    mocks.getPaperVoucherRequestStatus.mockImplementation(async (requestId: string) => ({
      requestId,
      state: "not_found"
    }));

    const cash = await loseCashResponseThenSwitchToQr();
    await waitFor(() =>
      expect(mocks.messageWarning).toHaveBeenCalledWith(PAPER_VOUCHER_PREVIOUS_NOT_RECORDED_MESSAGE)
    );
    expect(mocks.createOrderMutate).toHaveBeenCalledTimes(1);

    fireEvent.click(getPrintButton());
    await waitFor(() => expect(mocks.createOrderMutate).toHaveBeenCalledTimes(2));
    const qr = submittedOrders()[1];
    expect(qr.paymentMethodSystemName).toBe(PaymentType.VIETQR);
    expect(qr.paperVoucherRequestId).toMatch(UUID_V4);
    expect(qr.paperVoucherRequestId).not.toBe(cash.paperVoucherRequestId);
  }, 30000);

  it("waits while the lost attempt is still running on the server, and keeps blocking", async () => {
    mocks.getPaperVoucherRequestStatus.mockImplementation(async (requestId: string) => ({
      requestId,
      state: "in_progress"
    }));

    await loseCashResponseThenSwitchToQr();
    await waitFor(() =>
      expect(mocks.messageWarning).toHaveBeenCalledWith(PAPER_VOUCHER_REQUEST_IN_PROGRESS_MESSAGE)
    );

    fireEvent.click(getPrintButton());
    await waitFor(() => expect(mocks.getPaperVoucherRequestStatus).toHaveBeenCalledTimes(2));
    expect(mocks.createOrderMutate).toHaveBeenCalledTimes(1);
  }, 30000);

  it("a lookup failure creates nothing", async () => {
    mocks.getPaperVoucherRequestStatus.mockRejectedValue(createApiError());

    await loseCashResponseThenSwitchToQr();

    await waitFor(() =>
      expect(mocks.messageError).toHaveBeenLastCalledWith(
        "Chưa kiểm tra được kết quả lần bán trước. Thử lại sau; chưa tạo giao dịch mới."
      )
    );
    expect(mocks.createOrderMutate).toHaveBeenCalledTimes(1);
  }, 30000);

  it("REQUEST_ID_CONFLICT: looks the request up instead of selling again with a new id", async () => {
    mocks.quoteOrder.mockResolvedValue(createQuote());
    mocks.createOrderMutate.mockImplementationOnce((_body: OrderDto, options: CreateOrderOptions) =>
      options.onError(
        createApiError(409, {
          statusCode: 409,
          code: "PAPER_VOUCHER_REQUEST_ID_CONFLICT",
          message: "Mã giao dịch đã dùng cho đơn khác"
        })
      )
    );
    mocks.getPaperVoucherRequestStatus.mockImplementation(async (requestId: string) => ({
      requestId,
      state: "found",
      order: {
        id: 141,
        orderTotal: 100000,
        paymentMethodSystemName: "POS",
        paperVoucher: createOrderPaperVoucher(createQuote(), { requestId, replayed: true })
      }
    }));
    renderPaperVoucherActions(oneSeat);

    await applyVouchers(["LÔ-005"]);
    await waitForQuote(() => expect(getPrintButton()).toBeEnabled());
    fireEvent.click(getPrintButton());

    await waitFor(() =>
      expect(mocks.messageError).toHaveBeenCalledWith("Mã giao dịch đã dùng cho đơn khác")
    );
    await waitFor(() =>
      expect(mocks.getPaperVoucherRequestStatus).toHaveBeenCalledWith(
        submittedOrders()[0].paperVoucherRequestId
      )
    );
    await waitFor(() =>
      expect(mocks.messageWarning).toHaveBeenCalledWith(expect.stringContaining("đơn #141"))
    );
    expect(mocks.createOrderMutate).toHaveBeenCalledTimes(1);
  }, 30000);

  it("falls back to cash and re-quotes when the backend rejects the payment method", async () => {
    mocks.quoteOrder
      .mockResolvedValueOnce(createQuote({ allowedPaymentMethods: ["POS", PaymentType.VIETQR] }))
      .mockResolvedValue(createQuote());
    mocks.createOrderMutate.mockImplementationOnce((_body: OrderDto, options: CreateOrderOptions) =>
      options.onError(
        createApiError(400, {
          statusCode: 400,
          code: "PAPER_VOUCHER_PAYMENT_METHOD_NOT_ALLOWED",
          message: "Phương thức thanh toán không được phép"
        })
      )
    );
    renderPaperVoucherActions(oneSeat);

    await applyVouchers(["LÔ-005"]);
    await waitForQuote(() => expect(getPrintButton()).toBeEnabled());
    fireEvent.click(screen.getByLabelText("Quét VietQR"));
    fireEvent.click(getPrintButton());

    await waitFor(() =>
      expect(mocks.messageError).toHaveBeenCalledWith("Phương thức thanh toán không được phép")
    );
    await waitFor(() => expect(screen.getByLabelText("Quét VietQR")).not.toBeChecked());
    await waitForQuote(() => expect(mocks.quoteOrder).toHaveBeenCalledTimes(2));
    await waitForQuote(() => expect(screen.getByLabelText("Quét VietQR")).toBeDisabled());
    expect(mocks.createQrMutateAsync).not.toHaveBeenCalled();
  }, 30000);

  it("shows the message of other rejected sales and uses a new request id next time", async () => {
    const rejections = [
      createApiError(400, {
        statusCode: 400,
        code: "PAPER_VOUCHER_POS_DISABLED",
        message: "Chưa bật bán vé có voucher giấy"
      }),
      createApiError(409, {
        statusCode: 409,
        code: "PAPER_VOUCHER_REQUEST_ALREADY_CANCELLED",
        message: "Đơn của giao dịch voucher này đã bị hủy"
      })
    ];
    mocks.quoteOrder.mockResolvedValue(createQuote());
    mocks.createOrderMutate.mockImplementation((_body: OrderDto, options: CreateOrderOptions) => {
      const rejection = rejections.shift();
      if (rejection) options.onError(rejection);
    });
    renderPaperVoucherActions(oneSeat);

    await applyVouchers(["LÔ-005"]);
    const summary = await openVoucherSummary();
    await waitForQuote(() => expect(getPrintButton()).toBeEnabled());

    fireEvent.click(getPrintButton());
    await waitFor(() =>
      expect(mocks.messageError).toHaveBeenCalledWith("Chưa bật bán vé có voucher giấy")
    );
    fireEvent.click(getPrintButton());
    await waitFor(() =>
      expect(mocks.messageError).toHaveBeenCalledWith("Đơn của giao dịch voucher này đã bị hủy")
    );
    fireEvent.click(getPrintButton());
    await waitFor(() => expect(mocks.createOrderMutate).toHaveBeenCalledTimes(3));
    expect(mocks.getPaperVoucherRequestStatus).not.toHaveBeenCalled();

    const [first, second, third] = submittedOrders().map((order) => order.paperVoucherRequestId);
    expect(new Set([first, second, third]).size).toBe(3);
    // Backend từ chối: không bao giờ gửi lại thành đơn thường (thiếu voucher giấy).
    for (const order of submittedOrders()) {
      expect(order.paperVouchers).toEqual([{ batchId: 5, quantity: 1, faceValue: 80000 }]);
      expect(order.paperVoucherRequestId).toMatch(UUID_V4);
    }
    // Giữ nguyên lựa chọn voucher để thu ngân sửa; không báo giá lại.
    expect(summary).toBeInTheDocument();
    expect(screen.getByLabelText("Số lượng LÔ-005")).toHaveValue("1");
    expect(mocks.quoteOrder).toHaveBeenCalledTimes(1);
  }, 30000);

  it("re-quotes and starts a new request after a batch changed during the sale", async () => {
    mocks.quoteOrder.mockResolvedValue(createQuote());
    mocks.createOrderMutate.mockImplementationOnce((_body: OrderDto, options: CreateOrderOptions) =>
      options.onError(
        createApiError(409, {
          statusCode: 409,
          code: "PAPER_VOUCHER_INSUFFICIENT_QUANTITY",
          message: "LÔ-005 chỉ còn 0 voucher"
        })
      )
    );
    renderPaperVoucherActions(oneSeat);

    await applyVouchers(["LÔ-005"]);
    await waitForQuote(() => expect(getPrintButton()).toBeEnabled());

    fireEvent.click(getPrintButton());
    await waitFor(() =>
      expect(mocks.messageError).toHaveBeenCalledWith("LÔ-005 chỉ còn 0 voucher")
    );
    await waitForQuote(() => expect(mocks.quoteOrder).toHaveBeenCalledTimes(2));
    await waitForQuote(() => expect(getPrintButton()).toBeEnabled());

    fireEvent.click(getPrintButton());
    await waitFor(() => expect(mocks.createOrderMutate).toHaveBeenCalledTimes(2));
    const [first, second] = submittedOrders();
    expect(second.paperVoucherRequestId).not.toBe(first.paperVoucherRequestId);
  }, 30000);

  it("re-quotes with the swiped member card and books with it without reopening the dialog", async () => {
    mocks.quoteOrder.mockResolvedValue(createQuote());
    renderPaperVoucherActions(oneSeat);

    fireEvent.click(screen.getByLabelText("Quẹt thẻ VIP"));
    await applyVouchers(["LÔ-005"]);
    await openVoucherSummary();
    await waitForQuote(() => expect(getPrintButton()).toBeEnabled());

    fireEvent.click(getPrintButton());
    fireEvent.click(await screen.findByTestId("vip-card-confirm"));

    await waitForQuote(() =>
      expect(mocks.quoteOrder).toHaveBeenLastCalledWith(
        expect.objectContaining({ customerId: 7, memberCardCode: "VIP007", pointReward: 10000 }),
        expect.anything()
      )
    );
    expect(
      within(screen.getByTestId("paper-voucher-summary")).getByText("VIP007")
    ).toBeInTheDocument();
    expect(mocks.createOrderMutate).not.toHaveBeenCalled();

    await waitForQuote(() => expect(getPrintButton()).toBeEnabled());
    fireEvent.click(getPrintButton());
    await waitFor(() => expect(mocks.createOrderMutate).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId("vip-card-confirm")).not.toBeInTheDocument();
    expect(submittedOrders()[0]).toMatchObject({
      customerId: 7,
      memberCardCode: "VIP007",
      pointReward: 10000,
      paymentMethodSystemName: "POS",
      paperVouchers: [{ batchId: 5, quantity: 1, faceValue: 80000 }]
    });
  }, 30000);
});

/** Đơn QR có voucher giấy (P6): 100.000đ, voucher 80.000đ, QR 20.000đ, đang giữ voucher. */
const VOUCHER_QR_ORDER_ID = 150;

const createVoucherQrDetail = (
  paperVoucherStatus: "held" | "applied" | "released" | "cancelled",
  transactionStatus?: string
) => ({
  order: {
    id: VOUCHER_QR_ORDER_ID,
    orderTotal: 100000,
    orderStatusId: paperVoucherStatus === "applied" ? OrderStatus.COMPLETED : OrderStatus.PENDING,
    paymentStatusId: paperVoucherStatus === "applied" ? 30 : 10,
    orderPaymentTransactions: transactionStatus ? [{ status: transactionStatus }] : []
  },
  paperVoucher: { status: paperVoucherStatus, remainingPayable: 20000, voucherApplied: 80000 }
});

describe("Actions paper voucher VietQR (P6)", () => {
  beforeEach(async () => {
    await setupPaperVoucherServer({ batches: [...PAPER_VOUCHER_FIXTURES, BATCH_80K] });
    stubObjectUrls();
    useSettingPosStore.setState({ posName: "POS Machine 1", posShortName: "M11" });
  });

  /** Bán 1 vé với voucher 80.000đ bằng VietQR, đến lúc màn QR 20.000đ đang mở. */
  const openVoucherQr = async (setSelectedSeats = vi.fn()) => {
    const quote = createQuote({ allowedPaymentMethods: ["POS", PaymentType.VIETQR] });
    mocks.quoteOrder.mockResolvedValue(quote);
    mocks.createOrderMutate.mockImplementation((_body: OrderDto, options: CreateOrderOptions) =>
      options.onSuccess({
        id: VOUCHER_QR_ORDER_ID,
        orderTotal: 100000,
        orderDiscount: 0,
        orderStatusId: OrderStatus.PENDING,
        paymentStatusId: 10,
        shippingStatusId: 0,
        paymentMethodSystemName: PaymentType.VIETQR,
        createdOnUtc: "2026-11-04T10:00:00.000Z",
        paperVoucher: createOrderPaperVoucher(quote, {
          status: "held",
          paymentMethodSystemName: PaymentType.VIETQR,
          collectedAmount: null
        })
      })
    );
    mocks.createQrMutateAsync.mockResolvedValue({
      qrcode: "vietqr://payload",
      referenceLabelCode: "REF-150",
      accountName: "NCC",
      accountNumber: "123456789",
      accountBankName: "VietinBank",
      transactionAmount: 20000,
      paperVoucher: { orderTotal: 100000, voucherApplied: 80000, remainingPayable: 20000 }
    });
    renderWithProviders(
      <Actions
        data={createPlanScreening()}
        planScreenId={1}
        selectedSeats={oneSeat}
        setSelectedSeats={setSelectedSeats}
        cancelMode={false}
        setCancelMode={vi.fn()}
      />
    );
    await applyVouchers(["LÔ-005"]);
    await waitForQuote(() => expect(getPrintButton()).toBeEnabled());
    fireEvent.click(screen.getByLabelText("Quét VietQR"));
    fireEvent.click(getPrintButton());
    await waitFor(() => expect(screen.getByTestId("qr-dialog")).toBeInTheDocument());
    return { setSelectedSeats };
  };

  const paidMessages = () =>
    mocks.messageSuccess.mock.calls.filter(([text]) =>
      String(text).startsWith("Thanh toán VietQR thành công")
    );

  it("handles a duplicate paid event once and reports the QR amount and the batches used", async () => {
    const { setSelectedSeats } = await openVoucherQr();

    await act(async () => {
      paymentUpdatedHandler?.({ paymentStatus: 30, orderId: String(VOUCHER_QR_ORDER_ID) });
      paymentUpdatedHandler?.({ paymentStatus: 30, orderId: String(VOUCHER_QR_ORDER_ID) });
    });

    await waitFor(() => expect(screen.queryByTestId("qr-dialog")).not.toBeInTheDocument());
    expect(paidMessages()).toHaveLength(1);
    expect(paidMessages()[0][0]).toBe(
      `Thanh toán VietQR thành công ${formatMoney(20000)}. Voucher giấy ${formatMoney(80000)} (LÔ-005 ×1).`
    );
    expect(
      setSelectedSeats.mock.calls.filter(([seats]) => Array.isArray(seats) && seats.length === 0)
    ).toHaveLength(1);
  }, 30000);

  it("closing the QR waits for the backend: voucher released, no success, no new order", async () => {
    mocks.updateOrderMutateAsync.mockResolvedValue({});
    await openVoucherQr();

    fireEvent.click(screen.getByRole("button", { name: "Dong QR" }));

    await waitFor(() => expect(screen.queryByTestId("qr-dialog")).not.toBeInTheDocument());
    expect(mocks.updateOrderMutateAsync).toHaveBeenCalledWith({
      id: VOUCHER_QR_ORDER_ID,
      dto: expect.objectContaining({ orderStatusId: OrderStatus.FAIL })
    });
    expect(mocks.updateOrderMutate).not.toHaveBeenCalled();
    expect(mocks.messageWarning).toHaveBeenCalledWith(
      `Đơn #${VOUCHER_QR_ORDER_ID} đã kết thúc, voucher giấy đã được trả lại. Không in vé.`
    );
    expect(paidMessages()).toHaveLength(0);
    expect(mocks.createOrderMutate).toHaveBeenCalledTimes(1);
  }, 30000);

  it("keeps the QR open when closing fails (network): the screen closing is not the end of the payment", async () => {
    mocks.updateOrderMutateAsync.mockRejectedValue(createApiError());
    await openVoucherQr();

    fireEvent.click(screen.getByRole("button", { name: "Dong QR" }));

    await waitFor(() => expect(mocks.messageError).toHaveBeenCalled());
    expect(screen.getByTestId("qr-dialog")).toBeInTheDocument();
    expect(paidMessages()).toHaveLength(0);
  }, 30000);

  it("closing a QR the customer already paid completes the order instead (409 QR_PAYMENT_RECEIVED)", async () => {
    mocks.updateOrderMutateAsync
      .mockRejectedValueOnce(createApiError(409, { code: "PAPER_VOUCHER_QR_PAYMENT_RECEIVED" }))
      .mockResolvedValueOnce({});
    mocks.getOrderDetail.mockResolvedValue(createVoucherQrDetail("held", "success"));
    await openVoucherQr();

    fireEvent.click(screen.getByRole("button", { name: "Dong QR" }));

    await waitFor(() => expect(paidMessages()).toHaveLength(1));
    expect(mocks.updateOrderMutateAsync).toHaveBeenLastCalledWith({
      id: VOUCHER_QR_ORDER_ID,
      dto: expect.objectContaining({ orderStatusId: OrderStatus.COMPLETED })
    });
    expect(screen.queryByTestId("qr-dialog")).not.toBeInTheDocument();
  }, 30000);

  it("check transaction: still waiting keeps the voucher held and the QR open", async () => {
    mocks.checkTransaction.mockResolvedValue({ code: "00" });
    mocks.getOrderDetail.mockResolvedValue(createVoucherQrDetail("held"));
    await openVoucherQr();

    fireEvent.click(screen.getByRole("button", { name: "Kiem tra QR" }));

    await waitFor(() => expect(mocks.messageWarning).toHaveBeenCalled());
    expect(screen.getByTestId("qr-dialog")).toBeInTheDocument();
    expect(mocks.updateOrderMutateAsync).not.toHaveBeenCalled();
    expect(paidMessages()).toHaveLength(0);
  }, 30000);

  it("check transaction: a QR success on a released order (short / late payment) is never shown as paid", async () => {
    mocks.checkTransaction.mockResolvedValue({ code: "00" });
    mocks.getOrderDetail.mockResolvedValue(createVoucherQrDetail("released", "success"));
    await openVoucherQr();

    fireEvent.click(screen.getByRole("button", { name: "Kiem tra QR" }));

    await waitFor(() => expect(screen.queryByTestId("qr-dialog")).not.toBeInTheDocument());
    expect(paidMessages()).toHaveLength(0);
    expect(mocks.updateOrderMutateAsync).not.toHaveBeenCalled();
    expect(String(mocks.messageError.mock.calls.at(-1)?.[0])).toContain("báo quản lý đối soát");
  }, 30000);

  it("check transaction: an applied voucher (callback confirmed) completes the sale once", async () => {
    mocks.checkTransaction.mockResolvedValue({ code: "01" });
    mocks.getOrderDetail.mockResolvedValue(createVoucherQrDetail("applied", "success"));
    await openVoucherQr();

    fireEvent.click(screen.getByRole("button", { name: "Kiem tra QR" }));
    await waitFor(() => expect(paidMessages()).toHaveLength(1));
    await act(async () => {
      paymentUpdatedHandler?.({ paymentStatus: 30, orderId: String(VOUCHER_QR_ORDER_ID) });
    });

    expect(paidMessages()).toHaveLength(1);
    expect(mocks.updateOrderMutateAsync).not.toHaveBeenCalled();
  }, 30000);
});

describe("Actions paper voucher VNPayQR (P6)", () => {
  beforeEach(async () => {
    await setupPaperVoucherServer({ batches: [...PAPER_VOUCHER_FIXTURES, BATCH_80K] });
    stubObjectUrls();
    useSettingPosStore.setState({ posName: "POS Machine 1", posShortName: "M11" });
  });

  const ALL_QR_METHODS = ["POS", PaymentType.VIETQR, PaymentType.VNPAY];

  /** Bán 1 vé với voucher 80.000đ bằng VNPayQR, đến lúc màn QR 20.000đ đang mở. */
  const openVoucherVnpayQr = async (setSelectedSeats = vi.fn()) => {
    const quote = createQuote({ allowedPaymentMethods: ALL_QR_METHODS });
    mocks.quoteOrder.mockResolvedValue(quote);
    mocks.createOrderMutate.mockImplementation((_body: OrderDto, options: CreateOrderOptions) =>
      options.onSuccess({
        id: VOUCHER_QR_ORDER_ID,
        orderTotal: 100000,
        orderDiscount: 0,
        orderStatusId: OrderStatus.PENDING,
        paymentStatusId: 10,
        shippingStatusId: 0,
        paymentMethodSystemName: PaymentType.VNPAY,
        createdOnUtc: "2026-11-04T10:00:00.000Z",
        paperVoucher: createOrderPaperVoucher(quote, {
          status: "held",
          paymentMethodSystemName: PaymentType.VNPAY,
          collectedAmount: null
        })
      })
    );
    mocks.createQrMutateAsync.mockResolvedValue({
      qrcode: "000201VNPAY",
      referenceLabelCode: "qr-150",
      terminalId: "NCC12",
      transactionAmount: 20000,
      paperVoucher: { orderTotal: 100000, voucherApplied: 80000, remainingPayable: 20000 }
    });
    renderWithProviders(
      <Actions
        data={createPlanScreening()}
        planScreenId={1}
        selectedSeats={oneSeat}
        setSelectedSeats={setSelectedSeats}
        cancelMode={false}
        setCancelMode={vi.fn()}
      />
    );
    await applyVouchers(["LÔ-005"]);
    await waitForQuote(() => expect(getPrintButton()).toBeEnabled());
    fireEvent.click(screen.getByLabelText("Quét VNPayQR"));
    fireEvent.click(getPrintButton());
    await waitFor(() => expect(screen.getByTestId("qr-dialog")).toBeInTheDocument());
    return { setSelectedSeats };
  };

  const paidMessages = () =>
    mocks.messageSuccess.mock.calls.filter(([text]) =>
      String(text).startsWith("Thanh toán VNPayQR thành công")
    );

  it("P6-VNPAY-01 offers VNPayQR when the backend allows it and charges the QR with the 20.000 left", async () => {
    await openVoucherVnpayQr();

    expect(submittedOrders()[0]).toMatchObject({
      paymentMethodSystemName: PaymentType.VNPAY,
      expectedRemainingPayable: 20000
    });
    expect(mocks.createQrMutateAsync).toHaveBeenCalledWith({
      orderId: VOUCHER_QR_ORDER_ID,
      paymentMethod: PaymentType.VNPAY,
      shortName: "M11"
    });
    expect(window.api.sendQrOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        orderTotal: 100000,
        transactionAmount: 20000,
        paymentMethodSystemName: PaymentType.VNPAY,
        paperVoucher: expect.objectContaining({ voucherApplied: 80000, remainingPayable: 20000 })
      })
    );
    // QR đã tạo nhưng chưa thanh toán: chưa báo thành công.
    expect(paidMessages()).toHaveLength(0);
  }, 30000);

  it("P6-VNPAY-02 keeps VNPayQR disabled when the voucher pays everything (backend allows cash only)", async () => {
    mocks.quoteOrder.mockResolvedValue(createQuote({ allowedPaymentMethods: ["POS"] }));
    renderWithProviders(
      <Actions
        data={createPlanScreening()}
        planScreenId={1}
        selectedSeats={oneSeat}
        setSelectedSeats={vi.fn()}
        cancelMode={false}
        setCancelMode={vi.fn()}
      />
    );

    await applyVouchers(["LÔ-005"]);
    await waitForQuote(() => expect(getPrintButton()).toBeEnabled());

    expect(screen.getByLabelText("Quét VNPayQR")).toBeDisabled();
    expect(screen.getByLabelText("Quét VietQR")).toBeDisabled();
  }, 30000);

  it("P6-VNPAY-05 a paid socket event is shown once, only after the backend applied the voucher", async () => {
    mocks.getOrderDetail.mockResolvedValue(createVoucherQrDetail("applied", "success"));
    const { setSelectedSeats } = await openVoucherVnpayQr();

    await act(async () => {
      paymentUpdatedHandler?.({ paymentStatus: 30, orderId: String(VOUCHER_QR_ORDER_ID) });
      paymentUpdatedHandler?.({ paymentStatus: 30, orderId: String(VOUCHER_QR_ORDER_ID) });
    });

    await waitFor(() => expect(screen.queryByTestId("qr-dialog")).not.toBeInTheDocument());
    expect(paidMessages()).toHaveLength(1);
    expect(paidMessages()[0][0]).toBe(
      `Thanh toán VNPayQR thành công ${formatMoney(20000)}. Voucher giấy ${formatMoney(80000)} (LÔ-005 ×1).`
    );
    expect(
      setSelectedSeats.mock.calls.filter(([seats]) => Array.isArray(seats) && seats.length === 0)
    ).toHaveLength(1);
  }, 30000);

  it("check transaction never calls the VietQR check for VNPayQR: it reads the order (still waiting)", async () => {
    mocks.getOrderDetail.mockResolvedValue(createVoucherQrDetail("held"));
    await openVoucherVnpayQr();

    fireEvent.click(screen.getByRole("button", { name: "Kiem tra QR" }));

    await waitFor(() => expect(mocks.messageWarning).toHaveBeenCalled());
    expect(mocks.checkTransaction).not.toHaveBeenCalled();
    expect(screen.getByTestId("qr-dialog")).toBeInTheDocument();
    expect(mocks.updateOrderMutateAsync).not.toHaveBeenCalled();
    expect(paidMessages()).toHaveLength(0);
  }, 30000);

  it("P6-VNPAY-12 check transaction: IPN recorded but confirmation failed → completes via the backend once", async () => {
    mocks.updateOrderMutateAsync.mockResolvedValue({});
    mocks.getOrderDetail.mockResolvedValue(createVoucherQrDetail("held", "success"));
    await openVoucherVnpayQr();

    fireEvent.click(screen.getByRole("button", { name: "Kiem tra QR" }));

    await waitFor(() => expect(paidMessages()).toHaveLength(1));
    expect(mocks.checkTransaction).not.toHaveBeenCalled();
    expect(mocks.updateOrderMutateAsync).toHaveBeenCalledWith({
      id: VOUCHER_QR_ORDER_ID,
      dto: expect.objectContaining({ orderStatusId: OrderStatus.COMPLETED })
    });
  }, 30000);

  it("P6-VNPAY-11 closing an unpaid VNPayQR waits for the backend to release the voucher", async () => {
    mocks.updateOrderMutateAsync.mockResolvedValue({});
    await openVoucherVnpayQr();

    fireEvent.click(screen.getByRole("button", { name: "Dong QR" }));

    await waitFor(() => expect(screen.queryByTestId("qr-dialog")).not.toBeInTheDocument());
    expect(mocks.updateOrderMutateAsync).toHaveBeenCalledWith({
      id: VOUCHER_QR_ORDER_ID,
      dto: expect.objectContaining({ orderStatusId: OrderStatus.FAIL })
    });
    expect(paidMessages()).toHaveLength(0);
    expect(mocks.createOrderMutate).toHaveBeenCalledTimes(1);
  }, 30000);

  it("P6-VNPAY-13 keeps the VNPayQR open when the backend is unreachable while closing", async () => {
    mocks.updateOrderMutateAsync.mockRejectedValue(createApiError());
    await openVoucherVnpayQr();

    fireEvent.click(screen.getByRole("button", { name: "Dong QR" }));

    await waitFor(() => expect(mocks.messageError).toHaveBeenCalled());
    expect(screen.getByTestId("qr-dialog")).toBeInTheDocument();
    expect(paidMessages()).toHaveLength(0);
  }, 30000);

  it("P6-VNPAY-10 a VNPay success on a released order (late payment) is never shown as paid", async () => {
    mocks.getOrderDetail.mockResolvedValue(createVoucherQrDetail("released", "success"));
    await openVoucherVnpayQr();

    fireEvent.click(screen.getByRole("button", { name: "Kiem tra QR" }));

    await waitFor(() => expect(screen.queryByTestId("qr-dialog")).not.toBeInTheDocument());
    expect(paidMessages()).toHaveLength(0);
    expect(String(mocks.messageError.mock.calls.at(-1)?.[0])).toContain("báo quản lý đối soát");
  }, 30000);
});
