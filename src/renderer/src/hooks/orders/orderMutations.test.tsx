import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ordersApi } from "@renderer/api/orders.api";
import { invoicesApi } from "@renderer/api/invoice.api";
import { PaymentType } from "@shared/types";
import { invoicesKeys } from "@renderer/hooks/invoices/keys";
import { paperVoucherKeys } from "@renderer/hooks/paperVouchers/keys";
import { ordersKeys } from "./keys";
import { useCancelOrder } from "./useCancelOrder";
import { useCreateOrder } from "./useCreateOrder";
import { useCreateQrOrder } from "./useCreateQrOrder";
import { useSwapSeats } from "./useSwapSeats";
import { useUpdateOrder } from "./useUpdateOrder";
import { useUpdateRefundStatusOrder } from "./useUpdateRefundStatusOrder";
import { useCreateInvoice } from "../invoices/useCreateInvoice";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      },
      mutations: {
        retry: false
      }
    }
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { queryClient, wrapper };
};

describe("order and invoice mutations", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates an order and invalidates the orders cache", async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const createSpy = vi.spyOn(ordersApi, "create").mockResolvedValue({ id: 101 });

    const { result } = renderHook(() => useCreateOrder(), { wrapper });

    result.current.mutate({
      planScreenId: 22,
      floorNo: 1,
      paymentMethodSystemName: "POS",
      posName: "POS A",
      posShortName: "A1",
      listChairIndexF1: "1,2",
      listChairValueF1: "A1,A2"
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        planScreenId: 22,
        posName: "POS A"
      }),
      expect.anything()
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ordersKeys.all
    });
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: paperVoucherKeys.all });
  });

  it("refreshes paper voucher batches after an order with paper vouchers settles", async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    vi.spyOn(ordersApi, "create")
      .mockResolvedValueOnce({ id: 102 })
      .mockRejectedValueOnce(new Error("Báo giá đã thay đổi"));
    const dto = {
      planScreenId: 22,
      floorNo: 1,
      paymentMethodSystemName: "POS",
      posName: "POS A",
      posShortName: "A1",
      listChairIndexF1: "1",
      listChairValueF1: "A1",
      paperVouchers: [{ batchId: 3, quantity: 1, faceValue: 100000 }],
      paperVoucherRequestId: "6f1c2a8e-1d2b-4c3d-8e4f-5a6b7c8d9e0f",
      paperVoucherQuoteHash: "a".repeat(64),
      expectedRemainingPayable: 0
    };

    const { result } = renderHook(() => useCreateOrder(), { wrapper });

    result.current.mutate(dto);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ordersKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: paperVoucherKeys.all });

    invalidateSpy.mockClear();
    result.current.mutate(dto);
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: paperVoucherKeys.all });
  });

  it("creates a QR order and invalidates the orders cache", async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const createQrSpy = vi.spyOn(ordersApi, "createQr").mockResolvedValue({
      qrcode: "vietqr://payload",
      referenceLabelCode: "REF-01",
      accountName: "NCC",
      accountNumber: "123456789",
      accountBankName: "VietinBank"
    });

    const { result } = renderHook(() => useCreateQrOrder(), { wrapper });

    await result.current.mutateAsync({
      orderId: 55,
      paymentMethod: PaymentType.VIETQR,
      shortName: "M11"
    });

    expect(createQrSpy).toHaveBeenCalledWith(
      {
        orderId: 55,
        paymentMethod: PaymentType.VIETQR,
        shortName: "M11"
      },
      expect.anything()
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ordersKeys.all
    });
  });

  it("cancels an order and invalidates the orders cache", async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const cancelSpy = vi.spyOn(ordersApi, "cancel").mockResolvedValue({ success: true });

    const { result } = renderHook(() => useCancelOrder(), { wrapper });

    await result.current.mutateAsync({
      planScreenId: 10,
      cancelReasonId: 1,
      orderIds: [9]
    });

    expect(cancelSpy).toHaveBeenCalledWith(
      {
        planScreenId: 10,
        cancelReasonId: 1,
        orderIds: [9]
      },
      expect.anything()
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ordersKeys.all
    });
    // Hủy đơn có voucher giấy đang chờ QR trả lại voucher cho lô.
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: paperVoucherKeys.all });
  });

  it("refreshes paper voucher batches after closing a QR order", async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    vi.spyOn(ordersApi, "update").mockResolvedValue({ success: true });

    const { result } = renderHook(() => useUpdateOrder(), { wrapper });

    await result.current.mutateAsync({
      id: 140,
      dto: { orderStatusId: 60, paymentStatusId: 10, shippingStatusId: 0, planScreenId: 1 }
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ordersKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: paperVoucherKeys.all });
  });

  it("creates an invoice and invalidates the invoices cache", async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const createSpy = vi.spyOn(invoicesApi, "create").mockResolvedValue({ id: 88 });

    const { result } = renderHook(() => useCreateInvoice(), { wrapper });

    await result.current.mutateAsync({
      orderId: 88,
      partyA: "Cong ty A",
      taxCode: "01010101"
    });

    expect(createSpy).toHaveBeenCalledWith(
      {
        orderId: 88,
        partyA: "Cong ty A",
        taxCode: "01010101"
      },
      expect.anything()
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: invoicesKeys.all
    });
  });

  it("swaps seats and invalidates the orders cache", async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const swapSpy = vi.spyOn(ordersApi, "swapSeats").mockResolvedValue({ success: true });

    const { result } = renderHook(() => useSwapSeats(), { wrapper });

    await result.current.mutateAsync({
      orderId: 77,
      planScreenId: 10,
      newListChairIndexF1: "1,2",
      newListChairIndexF2: "",
      newListChairIndexF3: "",
      newListChairValueF1: "A1,A2",
      newListChairValueF2: "",
      newListChairValueF3: ""
    });

    expect(swapSpy).toHaveBeenCalledWith(
      {
        orderId: 77,
        planScreenId: 10,
        newListChairIndexF1: "1,2",
        newListChairIndexF2: "",
        newListChairIndexF3: "",
        newListChairValueF1: "A1,A2",
        newListChairValueF2: "",
        newListChairValueF3: ""
      },
      expect.anything()
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ordersKeys.all
    });
  });

  it("updates refund status and invalidates the orders cache", async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const updateRefundStatusSpy = vi
      .spyOn(ordersApi, "updateRefundStatus")
      .mockResolvedValue({ success: true });

    const { result } = renderHook(() => useUpdateRefundStatusOrder(), { wrapper });

    await result.current.mutateAsync({
      id: 77,
      RefundStatusId: 20
    });

    expect(updateRefundStatusSpy).toHaveBeenCalledWith({
      id: 77,
      RefundStatusId: 20
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ordersKeys.all
    });
  });
});
