import { initApi } from "@renderer/api/client";
import { queryClient } from "@renderer/lib/queryClient";
import { formatMoney } from "@renderer/lib/utils";
import { server } from "@renderer/test/msw/server";
import type { OrderDetailProps, OrderPaperVoucherDetail } from "@shared/types";
import { OrderStatus } from "@shared/types";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App, ConfigProvider } from "antd";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import OrderDetailDialog from "./OrderDetailDialog";

const TEST_API = "http://order-detail.test";

type DetailResponder = (id: number) => Promise<Response> | Response;

const asText = (value: string) => value.replace(/\s+/g, " ");

const makePaperVoucher = (orderTotal: number): OrderPaperVoucherDetail => ({
  redemptionId: 17,
  requestId: "6f1c2a4e-8a1b-4b7c-9d3e-2f6a1b0c9d8e",
  status: "applied",
  paymentMethodSystemName: "POS",
  orderTotal,
  voucherQuantity: 1,
  faceValueTotal: 80000,
  voucherApplied: 80000,
  remainingPayable: orderTotal - 80000,
  excessAmount: 0,
  collectedAmount: orderTotal - 80000,
  appliedAt: "2026-11-03T10:00:00.000Z",
  reversedAt: null,
  reversedBy: null,
  reversalSource: null,
  reversalReason: null,
  lines: [
    {
      batchId: 7,
      batchCode: "LÔ-007",
      batchName: "Voucher 80k",
      quantity: 1,
      faceValue: 80000,
      faceValueTotal: 80000,
      appliedAmount: 80000,
      excessAmount: 0,
      status: "applied"
    }
  ]
});

/** Dòng danh sách (`GET /api/pos/order`) không có `paperVoucher`; chi tiết trả `null` hoặc object. */
const makeDetail = (
  id: number,
  orderTotal: number,
  paperVoucher?: OrderPaperVoucherDetail | null
): OrderDetailProps =>
  ({
    order: {
      id,
      orderTotal,
      orderDiscount: 0,
      barCode: `BC${id}`,
      orderStatusId: OrderStatus.COMPLETED,
      paymentMethodSystemName: "POS",
      items: [],
      isInvitation: false,
      isContract: false
    },
    planScreening: null,
    film: { filmName: `Phim của đơn ${id}` },
    room: null,
    ...(paperVoucher === undefined ? {} : { paperVoucher })
  }) as unknown as OrderDetailProps;

const useDetailResponder = (responder: DetailResponder) => {
  server.use(
    http.get(`${TEST_API}/pos/cancel-ticket`, () =>
      HttpResponse.json({ data: [], total: 0, current: 1, pageSize: 100, pageCount: 0 })
    ),
    http.get(`${TEST_API}/api/pos/order/:id`, ({ params }) => responder(Number(params.id)))
  );
};

/** Mỗi đơn trả về khi test gọi `release(id)`, để mô phỏng response đến chậm/không theo thứ tự. */
const useDeferredDetails = (details: Record<number, OrderDetailProps>) => {
  const releases = new Map<number, () => void>();
  useDetailResponder(
    (id) =>
      new Promise<Response>((resolve) => {
        releases.set(id, () => resolve(HttpResponse.json(details[id])));
      })
  );
  const release = async (id: number) => {
    await waitFor(() => expect(releases.has(id)).toBe(true));
    await act(async () => releases.get(id)?.());
  };
  return { release };
};

const Providers = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <ConfigProvider theme={{ token: { motion: false } }}>
      <App>
        <MemoryRouter>{children}</MemoryRouter>
      </App>
    </ConfigProvider>
  </QueryClientProvider>
);

const renderDialog = (props: {
  selectedOrderId?: number;
  selectedItem?: OrderDetailProps | null;
}) => {
  const view = render(
    <Providers>
      <OrderDetailDialog open onOpenChange={() => undefined} {...props} />
    </Providers>
  );
  const rerender = (next: typeof props) =>
    view.rerender(
      <Providers>
        <OrderDetailDialog open onOpenChange={() => undefined} {...next} />
      </Providers>
    );
  return { rerender };
};

const getDialog = () => screen.getByRole("dialog");

// Dialog lớn (antd + nhiều query): khi chạy song song với suite khác dễ vượt 5 s mặc định.
describe("OrderDetailDialog — dữ liệu của đúng đơn đang mở", { timeout: 20000 }, () => {
  beforeEach(async () => {
    await initApi(TEST_API);
  });

  it("không hiện tổng đơn như tiền khách trả trước khi tải xong chi tiết đơn có voucher", async () => {
    const { release } = useDeferredDetails({
      11: makeDetail(11, 100000, makePaperVoucher(100000))
    });
    renderDialog({ selectedOrderId: 11, selectedItem: makeDetail(11, 100000) });

    expect(await within(getDialog()).findByTestId("order-payment-pending")).toHaveTextContent(
      "Đang tải..."
    );
    expect(within(getDialog()).queryByText("Khách cần thanh toán")).toBeInTheDocument();
    expect(within(getDialog()).queryByTestId("order-paper-voucher-lines")).not.toBeInTheDocument();

    await release(11);

    expect(
      await within(getDialog()).findByTestId("paper-voucher-paidByCustomer")
    ).toHaveTextContent(asText(`${formatMoney(20000)} (Tiền mặt)`));
    expect(within(getDialog()).getByTestId("order-paper-voucher-lines")).toBeInTheDocument();
    expect(within(getDialog()).queryByTestId("order-payment-pending")).not.toBeInTheDocument();
  });

  it("chuyển nhanh sang đơn khác: response trễ của đơn cũ không ghi đè đơn mới", async () => {
    const { release } = useDeferredDetails({
      21: makeDetail(21, 100000, makePaperVoucher(100000)),
      22: makeDetail(22, 50000, null)
    });
    const { rerender } = renderDialog({
      selectedOrderId: 21,
      selectedItem: makeDetail(21, 100000)
    });
    await within(getDialog()).findByTestId("order-payment-pending");

    rerender({ selectedOrderId: 22, selectedItem: makeDetail(22, 50000) });
    await release(21);

    expect(within(getDialog()).getByText("22")).toBeInTheDocument();
    expect(within(getDialog()).queryByText("21")).not.toBeInTheDocument();
    expect(within(getDialog()).queryByTestId("order-paper-voucher-lines")).not.toBeInTheDocument();
    expect(within(getDialog()).getByTestId("order-payment-pending")).toBeInTheDocument();

    await release(22);

    await waitFor(() =>
      expect(within(getDialog()).queryByTestId("order-payment-pending")).not.toBeInTheDocument()
    );
    expect(within(getDialog()).getByText("Khách cần thanh toán").parentElement).toHaveTextContent(
      asText(formatMoney(50000))
    );
    expect(within(getDialog()).queryByTestId("order-paper-voucher-lines")).not.toBeInTheDocument();
  });

  it("bỏ qua dòng danh sách của đơn khác và hiện trạng thái đang tải", async () => {
    useDeferredDetails({ 31: makeDetail(31, 90000, null) });
    renderDialog({ selectedOrderId: 31, selectedItem: makeDetail(30, 120000) });

    expect(await within(getDialog()).findByTestId("order-detail-loading")).toBeInTheDocument();
    expect(within(getDialog()).queryByText("Phim của đơn 30")).not.toBeInTheDocument();
  });

  it("báo lỗi và cho thử lại khi không tải được đơn không có dữ liệu tạm", async () => {
    // App tự thử lại 1 lần (`retry: 1`); chỉ lần bấm "Thử lại" mới thành công.
    const failedAttempts = 2;
    let attempts = 0;
    useDetailResponder((id) => {
      attempts += 1;
      return attempts <= failedAttempts
        ? HttpResponse.json({ statusCode: 500, message: "Lỗi máy chủ" }, { status: 500 })
        : HttpResponse.json(makeDetail(id, 70000, null));
    });
    renderDialog({ selectedOrderId: 41 });

    const actualError = await within(getDialog()).findByTestId("order-detail-error", undefined, {
      timeout: 5000
    });
    fireEvent.click(within(actualError).getByRole("button", { name: "Thử lại" }));

    expect(await within(getDialog()).findByText("Phim của đơn 41")).toBeInTheDocument();
    expect(within(getDialog()).queryByTestId("order-detail-error")).not.toBeInTheDocument();
  });

  it("giữ dữ liệu tạm kèm cảnh báo khi không tải được chi tiết", async () => {
    useDetailResponder(() =>
      HttpResponse.json({ statusCode: 500, message: "Lỗi máy chủ" }, { status: 500 })
    );
    renderDialog({ selectedOrderId: 51, selectedItem: makeDetail(51, 100000) });

    expect(
      await within(getDialog()).findByTestId("order-detail-stale-warning", undefined, {
        timeout: 5000
      })
    ).toBeInTheDocument();
    expect(within(getDialog()).getByTestId("order-payment-pending")).toHaveTextContent(
      "Chưa tải được"
    );
  });
});
