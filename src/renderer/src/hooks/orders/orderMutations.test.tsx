import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ordersApi } from "@renderer/api/orders.api";
import { invoicesApi } from "@renderer/api/invoice.api";
import { invoicesKeys } from "@renderer/hooks/invoices/keys";
import { ordersKeys } from "./keys";
import { useCancelOrder } from "./useCancelOrder";
import { useCreateOrder } from "./useCreateOrder";
import { useCreateQrOrder } from "./useCreateQrOrder";
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
      paymentMethod: "VIETQR",
      shortName: "M11"
    });

    expect(createQrSpy).toHaveBeenCalledWith(
      {
        orderId: 55,
        paymentMethod: "VIETQR",
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
});
