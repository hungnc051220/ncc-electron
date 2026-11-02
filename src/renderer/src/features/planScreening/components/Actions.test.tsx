import { ReactNode } from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { formatMoney } from "@renderer/lib/utils";
import { usePrinterStore } from "@renderer/store/printer.store";
import { useSettingPosStore } from "@renderer/store/settingPos.store";
import {
  DiscountProps,
  ListSeat,
  OrderStatus,
  PaymentType,
  PlanScreeningDetailProps
} from "@shared/types";
import { paperVoucherMockRepository } from "@renderer/features/vouchers/paperVouchers/paperVoucher.mock";
import { stubObjectUrls } from "@renderer/features/vouchers/paperVouchers/paperVoucher.testUtils";
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
  messageSuccess: vi.fn(),
  messageError: vi.fn(),
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
      error: mocks.messageError
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
  default: () => null
}));

vi.mock("../../invoices/components/InvoiceDialog", () => ({
  default: ({ open, orderId }: { open: boolean; orderId: number }) =>
    open ? <div data-testid="invoice-dialog">Invoice order {orderId}</div> : null
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

describe("Actions paper vouchers (mock)", () => {
  const twoSeats = [createSeat(), createSeat({ seat: "2", code: "A2", price: 90000 })];

  const renderActions = (selectedSeats: ListSeat[] = twoSeats) => {
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

  beforeEach(() => {
    paperVoucherMockRepository.reset();
    stubObjectUrls();
    mocks.createOrderMutate.mockReset();
    mocks.messageSuccess.mockReset();
    mocks.messageError.mockReset();
    mocks.modalConfirm.mockReset();
    useSettingPosStore.setState({ posName: "POS Machine 1", posShortName: "M11" });
  });

  it("applies several batches and blocks the real sale while they are selected", async () => {
    renderActions();

    const summary = await applyVouchers(["LÔ-003", "LÔ-004"]);

    expect(within(summary).getByText(/LÔ-003/)).toBeInTheDocument();
    expect(within(summary).getByText(/LÔ-004/)).toBeInTheDocument();
    expect(within(summary).getByText("Dữ liệu mẫu")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /in vé/i })).toBeDisabled();
    expect(mocks.createOrderMutate).not.toHaveBeenCalled();

    fireEvent.click(within(summary).getByText("Bỏ áp dụng").closest("button")!);
    expect(screen.queryByTestId("paper-voucher-pos-summary")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /in vé/i })).toBeEnabled();
  });

  it("revalidates the selection when seats change and clears it when no seat is left", async () => {
    const { rerenderSeats } = renderActions();
    await applyVouchers(["LÔ-003", "LÔ-004"]);

    rerenderSeats([createSeat()]);
    const summary = screen.getByTestId("paper-voucher-pos-summary");
    expect(within(summary).getByRole("alert")).toHaveTextContent(
      "Số voucher (2) vượt số vé đang chọn (1)"
    );
    expect(within(summary).getByText("Mô phỏng hoàn tất").closest("button")).toBeDisabled();

    rerenderSeats([]);
    await waitFor(() =>
      expect(screen.queryByTestId("paper-voucher-pos-summary")).not.toBeInTheDocument()
    );
  });

  it("records a simulated completion once without calling the real order API", async () => {
    renderActions();
    const summary = await applyVouchers(["LÔ-003", "LÔ-004"]);

    fireEvent.click(within(summary).getByText("Mô phỏng hoàn tất").closest("button")!);
    expect(mocks.modalConfirm).toHaveBeenCalledTimes(1);
    const { onOk } = mocks.modalConfirm.mock.calls[0][0] as { onOk: () => Promise<void> };

    await act(async () => {
      await onOk();
    });

    const batches = await paperVoucherMockRepository.list();
    expect(batches.find((item) => item.id === 3)?.usedCount).toBe(87);
    expect(batches.find((item) => item.id === 4)?.usedCount).toBe(1);
    expect((await paperVoucherMockRepository.listUsages(3))[0]).toMatchObject({
      quantity: 1,
      staffName: "Cashier",
      appliedAmount: 100000
    });
    expect(mocks.messageSuccess).toHaveBeenCalledWith(
      expect.stringContaining("dữ liệu mẫu (chưa lưu lên hệ thống)")
    );
    expect(screen.queryByTestId("paper-voucher-pos-summary")).not.toBeInTheDocument();

    await act(async () => {
      await onOk();
    });
    expect((await paperVoucherMockRepository.list()).find((item) => item.id === 3)?.usedCount).toBe(
      87
    );
    expect(mocks.messageError).toHaveBeenCalledWith(
      "Giao dịch mô phỏng này đã được ghi nhận trước đó"
    );
    expect(mocks.createOrderMutate).not.toHaveBeenCalled();
    expect(mocks.createQrMutateAsync).not.toHaveBeenCalled();
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
