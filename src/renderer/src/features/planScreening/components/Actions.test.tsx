import { ReactNode } from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatMoney } from "@renderer/lib/utils";
import { usePrinterStore } from "@renderer/store/printer.store";
import { useSettingPosStore } from "@renderer/store/settingPos.store";
import {
  DiscountProps,
  ListSeat,
  OrderStatus,
  PaperVoucherOrderQuote,
  PaymentType,
  PlanScreeningDetailProps
} from "@shared/types";
import type { OrderDto } from "@renderer/api/orders.api";
import {
  PAPER_VOUCHER_NETWORK_ERROR_MESSAGE,
  PAPER_VOUCHER_QUOTE_CHANGED_MESSAGE
} from "./paperVoucherSale";
import {
  setupPaperVoucherServer,
  stubObjectUrls
} from "@renderer/features/vouchers/paperVouchers/paperVoucher.testUtils";
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
  cancelReserve: vi.fn(),
  quoteOrder: vi.fn(),
  messageSuccess: vi.fn(),
  messageError: vi.fn(),
  messageWarning: vi.fn(),
  invalidateQueries: vi.fn(),
  modalConfirm: vi.fn()
}));

vi.mock("@renderer/features/vouchers/paperVouchers/paperVoucher.utils", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@renderer/features/vouchers/paperVouchers/paperVoucher.utils")
  >()),
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
    quote: mocks.quoteOrder
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
          isComplete: true
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
  return screen.findByTestId("paper-voucher-pos-summary");
};

// Test voucher giấy mở dialog antd và chờ báo giá: khi chạy song song toàn bộ test có thể chậm hơn
// mặc định 5 s, nên các test bên dưới đặt timeout 30 s.
const getPrintButton = () => screen.getByRole("button", { name: /in vé/i });

describe("Actions paper vouchers (sale flag off)", () => {
  let paperVoucherServer: Awaited<ReturnType<typeof setupPaperVoucherServer>>;

  beforeEach(async () => {
    vi.stubEnv("VITE_PAPER_VOUCHER_SALE_ENABLED", "false");
    paperVoucherServer = await setupPaperVoucherServer();
    stubObjectUrls();
    mocks.createOrderMutate.mockReset();
    mocks.messageSuccess.mockReset();
    mocks.messageError.mockReset();
    mocks.modalConfirm.mockReset();
    useSettingPosStore.setState({ posName: "POS Machine 1", posShortName: "M11" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("applies several batches and blocks the real sale while they are selected", async () => {
    renderPaperVoucherActions();

    const summary = await applyVouchers(["LÔ-003", "LÔ-004"]);

    expect(within(summary).getByText(/LÔ-003/)).toBeInTheDocument();
    expect(within(summary).getByText(/LÔ-004/)).toBeInTheDocument();
    expect(within(summary).getByText("Chưa ghi nhận vào đơn")).toBeInTheDocument();
    expect(within(summary).queryByText(/Mô phỏng/)).not.toBeInTheDocument();
    expect(getPrintButton()).toBeDisabled();

    fireEvent.click(getPrintButton());
    expect(mocks.createOrderMutate).not.toHaveBeenCalled();
    expect(mocks.quoteOrder).not.toHaveBeenCalled();
    expect(paperVoucherServer.requestBodies).toEqual([]);

    fireEvent.click(within(summary).getByText("Bỏ áp dụng").closest("button")!);
    expect(screen.queryByTestId("paper-voucher-pos-summary")).not.toBeInTheDocument();
    expect(getPrintButton()).toBeEnabled();
  }, 30000);

  it("does not cap vouchers by the seat count and clears them when no seat is left", async () => {
    const { rerenderSeats } = renderPaperVoucherActions();
    await applyVouchers(["LÔ-003", "LÔ-004"]);

    rerenderSeats([createSeat()]);
    const summary = screen.getByTestId("paper-voucher-pos-summary");
    expect(within(summary).getByText(/LÔ-004/)).toBeInTheDocument();
    expect(within(summary).queryByTestId("paper-voucher-selection-error")).toBeNull();

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
const TICKET_PRICE_UNDETERMINED_MESSAGE =
  "Đơn nhiều vé chưa được voucher giấy trả hết hiện chưa được hỗ trợ";

const createQuote = (overrides: Partial<PaperVoucherOrderQuote> = {}): PaperVoucherOrderQuote => ({
  businessDate: "2026-10-30",
  baseTotal: 190000,
  orderDiscount: 0,
  finalOrderTotal: 0,
  paperVoucher: {
    lines: [
      {
        batchId: 3,
        batchCode: "LÔ-003",
        quantity: 1,
        faceValue: 100000,
        faceValueTotal: 100000,
        appliedAmount: 100000,
        excessAmount: 0
      },
      {
        batchId: 4,
        batchCode: "LÔ-004",
        quantity: 1,
        faceValue: 95000,
        faceValueTotal: 95000,
        appliedAmount: 90000,
        excessAmount: 5000
      }
    ],
    voucherQuantity: 2,
    faceValueTotal: 195000,
    voucherApplied: 190000,
    excessAmount: 5000
  },
  allowedPaymentMethods: ["POS"],
  warnings: [{ code: "PAPER_VOUCHER_EXCESS", message: "Mệnh giá vượt 5.000 ₫ không hoàn lại" }],
  quoteHash: "a".repeat(64),
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

describe("Actions paper voucher sale (VITE_PAPER_VOUCHER_SALE_ENABLED=true)", () => {
  beforeEach(async () => {
    vi.stubEnv("VITE_PAPER_VOUCHER_SALE_ENABLED", "true");
    await setupPaperVoucherServer();
    stubObjectUrls();
    useSettingPosStore.setState({ posName: "POS Machine 1", posShortName: "M11" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("requests a backend quote with the full order body and shows its amounts", async () => {
    mocks.quoteOrder.mockResolvedValue(createQuote());
    renderPaperVoucherActions();

    fireEvent.click(screen.getByTestId("apply-discount"));
    const summary = await applyVouchers(["LÔ-003", "LÔ-004"]);

    expect(within(summary).getByTestId("paper-voucher-quote-loading")).toBeInTheDocument();
    expect(getPrintButton()).toBeDisabled();

    await within(summary).findByTestId("paper-voucher-final-total", {}, QUOTE_WAIT);
    expect(mocks.quoteOrder).toHaveBeenCalledTimes(1);
    expect(mocks.quoteOrder).toHaveBeenCalledWith(
      {
        planScreenId: 1,
        floorNo: 1,
        paymentMethodSystemName: "POS",
        posName: "POS Machine 1",
        posShortName: "M11",
        isInvitation: false,
        discountGroups: [{ discountId: 1, chairIndices: ["1", "2"] }],
        hasManualInvoice: false,
        listChairIndexF1: "1,2",
        listChairValueF1: "A1,A2",
        paperVouchers: [
          { batchId: 3, quantity: 1, faceValue: 100000 },
          { batchId: 4, quantity: 1, faceValue: 95000 }
        ]
      },
      expect.anything()
    );

    expect(within(summary).getByText("Chỉ thanh toán tiền mặt")).toBeInTheDocument();
    expect(textOf("paper-voucher-base-total")).toBe(money(190000));
    expect(textOf("paper-voucher-applied")).toBe(`−${money(190000)}`);
    expect(textOf("paper-voucher-excess")).toBe(money(5000));
    expect(summary).toHaveTextContent("(không hoàn lại)");
    expect(textOf("paper-voucher-final-total")).toBe(money(0));
    expect(screen.getByTestId("paper-voucher-quote-warning")).toHaveTextContent(
      "Mệnh giá vượt 5.000 ₫ không hoàn lại"
    );
    // Ô "Thành tiền" hiển thị số tiền backend báo giá thay vì tự tính.
    expect(textOf("order-final-amount")).toBe(money(0));
    expect(getPrintButton()).toBeEnabled();
  }, 30000);

  it("allows only cash payment and blocks seat reservation while vouchers are selected", async () => {
    mocks.quoteOrder.mockResolvedValue(createQuote());
    renderPaperVoucherActions();

    fireEvent.click(screen.getByLabelText("Quét VietQR"));
    expect(screen.getByLabelText("Quét VietQR")).toBeChecked();

    const summary = await applyVouchers(["LÔ-003"]);

    await waitFor(() => expect(screen.getByLabelText("Quét VietQR")).not.toBeChecked());
    expect(screen.getByLabelText("Quét VietQR")).toBeDisabled();
    expect(screen.getByLabelText("Quét VNPayQR")).toBeDisabled();
    expect(screen.getByRole("button", { name: /giữ chỗ/i })).toBeDisabled();

    fireEvent.click(within(summary).getByText("Bỏ áp dụng").closest("button")!);
    expect(screen.getByLabelText("Quét VietQR")).toBeEnabled();
    expect(screen.getByRole("button", { name: /giữ chỗ/i })).toBeEnabled();
    expect(mocks.createOrderMutate).not.toHaveBeenCalled();
  }, 30000);

  it("keeps In vé disabled while the quote is loading", async () => {
    let resolveQuote: (quote: PaperVoucherOrderQuote) => void = () => undefined;
    mocks.quoteOrder.mockReturnValue(
      new Promise<PaperVoucherOrderQuote>((resolve) => {
        resolveQuote = resolve;
      })
    );
    renderPaperVoucherActions();

    const summary = await applyVouchers(["LÔ-003"]);
    await waitForQuote(() => expect(mocks.quoteOrder).toHaveBeenCalledTimes(1));
    expect(within(summary).getByTestId("paper-voucher-quote-loading")).toBeInTheDocument();
    expect(getPrintButton()).toBeDisabled();
    expect(textOf("order-final-amount")).toBe("--");

    await act(async () => resolveQuote(createQuote()));
    await waitForQuote(() => expect(getPrintButton()).toBeEnabled());
  }, 30000);

  it("shows the backend message when the quote is rejected and lets the cashier retry", async () => {
    mocks.quoteOrder.mockRejectedValueOnce(
      createApiError(400, {
        statusCode: 400,
        code: "PAPER_VOUCHER_TICKET_PRICE_UNDETERMINED",
        message: TICKET_PRICE_UNDETERMINED_MESSAGE
      })
    );
    mocks.quoteOrder.mockResolvedValue(createQuote());
    renderPaperVoucherActions();

    const summary = await applyVouchers(["LÔ-003"]);

    expect(
      await within(summary).findByTestId("paper-voucher-quote-error", {}, QUOTE_WAIT)
    ).toHaveTextContent(TICKET_PRICE_UNDETERMINED_MESSAGE);
    expect(getPrintButton()).toBeDisabled();

    fireEvent.click(within(summary).getByText("Thử lại").closest("button")!);
    await waitForQuote(() => expect(getPrintButton()).toBeEnabled());
    expect(mocks.quoteOrder).toHaveBeenCalledTimes(2);
  }, 30000);

  it("reuses the request id for network/5xx retries and a changed quote, renews it after a sale", async () => {
    const changedQuote = createQuote({ finalOrderTotal: 10000, quoteHash: "b".repeat(64) });
    const outcomes: Array<(options: CreateOrderOptions) => void> = [
      (options) => options.onError(createApiError()),
      (options) =>
        options.onError(createApiError(503, { statusCode: 503, message: "Hệ thống đang bận" })),
      (options) =>
        options.onError(
          createApiError(409, {
            statusCode: 409,
            code: "PAPER_VOUCHER_QUOTE_CHANGED",
            message: "Báo giá đã thay đổi",
            details: { quote: changedQuote }
          })
        ),
      (options) =>
        void options.onSuccess({
          id: 120,
          orderTotal: 10000,
          orderDiscount: 0,
          createdOnUtc: "2026-10-30T10:00:00.000Z"
        })
    ];
    mocks.quoteOrder.mockResolvedValue(createQuote());
    mocks.createOrderMutate.mockImplementation((_body: OrderDto, options: CreateOrderOptions) =>
      outcomes.shift()?.(options)
    );
    renderPaperVoucherActions();

    await applyVouchers(["LÔ-003", "LÔ-004"]);
    await waitForQuote(() => expect(getPrintButton()).toBeEnabled());

    fireEvent.click(getPrintButton());
    await waitFor(() => expect(mocks.createOrderMutate).toHaveBeenCalledTimes(1));
    expect(mocks.messageError).toHaveBeenLastCalledWith(PAPER_VOUCHER_NETWORK_ERROR_MESSAGE);

    fireEvent.click(getPrintButton());
    await waitFor(() => expect(mocks.createOrderMutate).toHaveBeenCalledTimes(2));
    expect(mocks.messageError).toHaveBeenLastCalledWith("Hệ thống đang bận");

    fireEvent.click(getPrintButton());
    await waitFor(() => expect(mocks.createOrderMutate).toHaveBeenCalledTimes(3));
    expect(mocks.messageWarning).toHaveBeenCalledWith(PAPER_VOUCHER_QUOTE_CHANGED_MESSAGE);
    // Báo giá mới từ lỗi 409 thay báo giá đang hiển thị, không tự gửi lại đơn.
    await waitForQuote(() => expect(textOf("paper-voucher-final-total")).toBe(money(10000)));
    expect(textOf("order-final-amount")).toBe(money(10000));
    expect(mocks.createOrderMutate).toHaveBeenCalledTimes(3);
    expect(mocks.quoteOrder).toHaveBeenCalledTimes(1);

    fireEvent.click(getPrintButton());
    await waitFor(() => expect(mocks.createOrderMutate).toHaveBeenCalledTimes(4));

    const [network, serverError, quoteChanged, confirmed] = submittedOrders();
    expect(network).toMatchObject({
      paymentMethodSystemName: "POS",
      paperVouchers: [
        { batchId: 3, quantity: 1, faceValue: 100000 },
        { batchId: 4, quantity: 1, faceValue: 95000 }
      ],
      paperVoucherQuoteHash: "a".repeat(64),
      expectedFinalOrderTotal: 0
    });
    expect(network.paperVoucherRequestId).toMatch(UUID_V4);
    expect(serverError.paperVoucherRequestId).toBe(network.paperVoucherRequestId);
    expect(quoteChanged.paperVoucherRequestId).toBe(network.paperVoucherRequestId);
    // Sau 409 báo giá đổi: cùng lần bán, gửi lại cùng mã request với hash/số tiền mới.
    expect(confirmed).toMatchObject({
      paperVoucherRequestId: network.paperVoucherRequestId,
      paperVoucherQuoteHash: "b".repeat(64),
      expectedFinalOrderTotal: 10000
    });

    await waitFor(() =>
      expect(screen.queryByTestId("paper-voucher-pos-summary")).not.toBeInTheDocument()
    );
    expect(mocks.messageSuccess).toHaveBeenCalledWith("Tạo đơn thành công");
    expect(sessionStorage.getItem("lastTotal")).toBe("10000");

    // Lần bán tiếp theo (cùng lựa chọn) dùng mã request mới.
    mocks.createOrderMutate.mockImplementation(() => undefined);
    await applyVouchers(["LÔ-003", "LÔ-004"]);
    await waitForQuote(() => expect(getPrintButton()).toBeEnabled());
    fireEvent.click(getPrintButton());
    await waitFor(() => expect(mocks.createOrderMutate).toHaveBeenCalledTimes(5));
    expect(submittedOrders()[4].paperVoucherRequestId).toMatch(UUID_V4);
    expect(submittedOrders()[4].paperVoucherRequestId).not.toBe(confirmed.paperVoucherRequestId);
  }, 30000);

  it("shows the message of other rejected sales and uses a new request id next time", async () => {
    const rejections = [
      createApiError(400, {
        statusCode: 400,
        code: "PAPER_VOUCHER_TICKET_PRICE_UNDETERMINED",
        message: TICKET_PRICE_UNDETERMINED_MESSAGE
      }),
      createApiError(409, {
        statusCode: 409,
        code: "PAPER_VOUCHER_REQUEST_ID_CONFLICT",
        message: "Mã giao dịch đã dùng cho đơn khác"
      })
    ];
    mocks.quoteOrder.mockResolvedValue(createQuote());
    mocks.createOrderMutate.mockImplementation((_body: OrderDto, options: CreateOrderOptions) => {
      const rejection = rejections.shift();
      if (rejection) options.onError(rejection);
    });
    renderPaperVoucherActions();

    const summary = await applyVouchers(["LÔ-003"]);
    await waitForQuote(() => expect(getPrintButton()).toBeEnabled());

    fireEvent.click(getPrintButton());
    await waitFor(() =>
      expect(mocks.messageError).toHaveBeenCalledWith(TICKET_PRICE_UNDETERMINED_MESSAGE)
    );
    fireEvent.click(getPrintButton());
    await waitFor(() =>
      expect(mocks.messageError).toHaveBeenCalledWith("Mã giao dịch đã dùng cho đơn khác")
    );
    fireEvent.click(getPrintButton());
    await waitFor(() => expect(mocks.createOrderMutate).toHaveBeenCalledTimes(3));

    const [first, second, third] = submittedOrders().map((order) => order.paperVoucherRequestId);
    expect(new Set([first, second, third]).size).toBe(3);
    // Giữ nguyên lựa chọn voucher để thu ngân sửa; không báo giá lại.
    expect(within(summary).getByText(/LÔ-003/)).toBeInTheDocument();
    expect(mocks.quoteOrder).toHaveBeenCalledTimes(1);
  }, 30000);

  it("re-quotes and starts a new request after a batch changed during the sale", async () => {
    mocks.quoteOrder.mockResolvedValue(createQuote());
    mocks.createOrderMutate.mockImplementationOnce((_body: OrderDto, options: CreateOrderOptions) =>
      options.onError(
        createApiError(409, {
          statusCode: 409,
          code: "PAPER_VOUCHER_INSUFFICIENT_QUANTITY",
          message: "LÔ-003 chỉ còn 0 voucher"
        })
      )
    );
    renderPaperVoucherActions();

    await applyVouchers(["LÔ-003"]);
    await waitForQuote(() => expect(getPrintButton()).toBeEnabled());

    fireEvent.click(getPrintButton());
    await waitFor(() =>
      expect(mocks.messageError).toHaveBeenCalledWith("LÔ-003 chỉ còn 0 voucher")
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
    renderPaperVoucherActions();

    fireEvent.click(screen.getByLabelText("Quẹt thẻ VIP"));
    const summary = await applyVouchers(["LÔ-003"]);
    await waitForQuote(() => expect(getPrintButton()).toBeEnabled());

    fireEvent.click(getPrintButton());
    fireEvent.click(await screen.findByTestId("vip-card-confirm"));

    await waitForQuote(() =>
      expect(mocks.quoteOrder).toHaveBeenLastCalledWith(
        expect.objectContaining({ customerId: 7, memberCardCode: "VIP007", pointReward: 10000 }),
        expect.anything()
      )
    );
    expect(within(summary).getByText("Thẻ VIP007")).toBeInTheDocument();
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
      paperVouchers: [{ batchId: 3, quantity: 1, faceValue: 100000 }]
    });
  }, 30000);
});
