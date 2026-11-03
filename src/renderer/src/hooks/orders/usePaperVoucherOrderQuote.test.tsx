import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ordersApi, type OrderQuoteDto } from "@renderer/api/orders.api";
import type { PaperVoucherOrderQuote } from "@shared/types";
import { usePaperVoucherOrderQuote } from "./usePaperVoucherOrderQuote";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return wrapper;
};

const createDto = (quantity: number): OrderQuoteDto => ({
  planScreenId: 1,
  floorNo: 1,
  paymentMethodSystemName: "POS",
  posName: "POS A",
  posShortName: "A1",
  isInvitation: false,
  listChairIndexF1: "1",
  listChairValueF1: "A1",
  paperVouchers: [{ batchId: 3, quantity, faceValue: 100000 }]
});

const createQuote = (finalOrderTotal: number, hash = "a"): PaperVoucherOrderQuote => ({
  businessDate: "2026-10-30",
  baseTotal: 100000,
  orderDiscount: 0,
  finalOrderTotal,
  paperVoucher: {
    lines: [],
    voucherQuantity: 1,
    faceValueTotal: 100000,
    voucherApplied: 100000 - finalOrderTotal,
    excessAmount: 0
  },
  allowedPaymentMethods: ["POS"],
  warnings: [],
  quoteHash: hash.repeat(64)
});

const deferred = <T,>() => {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe("usePaperVoucherOrderQuote", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not request a quote without a body", () => {
    const quoteSpy = vi.spyOn(ordersApi, "quote");
    const { result } = renderHook(() => usePaperVoucherOrderQuote(null), {
      wrapper: createWrapper()
    });

    expect(result.current).toMatchObject({ isLoading: false, isReady: false, quote: undefined });
    expect(quoteSpy).not.toHaveBeenCalled();
  });

  it("debounces selection changes and requests only the latest body", async () => {
    const quoteSpy = vi.spyOn(ordersApi, "quote").mockResolvedValue(createQuote(0));
    const { result, rerender } = renderHook(
      ({ dto }: { dto: OrderQuoteDto | null }) => usePaperVoucherOrderQuote(dto),
      { wrapper: createWrapper(), initialProps: { dto: null as OrderQuoteDto | null } }
    );

    rerender({ dto: createDto(1) });
    rerender({ dto: createDto(2) });
    // Body tạo lại nhưng cùng nội dung: không tính là lựa chọn mới.
    rerender({ dto: createDto(3) });
    rerender({ dto: createDto(3) });
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(quoteSpy).toHaveBeenCalledTimes(1);
    expect(quoteSpy).toHaveBeenCalledWith(createDto(3), expect.anything());
  });

  it("cancels and ignores the response of a previous selection", async () => {
    const stale = deferred<PaperVoucherOrderQuote>();
    const quoteSpy = vi
      .spyOn(ordersApi, "quote")
      .mockImplementation((dto) =>
        dto.paperVouchers[0].quantity === 1 ? stale.promise : Promise.resolve(createQuote(0, "c"))
      );
    const { result, rerender } = renderHook(
      ({ dto }: { dto: OrderQuoteDto | null }) => usePaperVoucherOrderQuote(dto),
      { wrapper: createWrapper(), initialProps: { dto: createDto(1) as OrderQuoteDto | null } }
    );

    await waitFor(() => expect(quoteSpy).toHaveBeenCalledTimes(1));
    const staleSignal = quoteSpy.mock.calls[0][1];

    rerender({ dto: createDto(2) });
    await waitFor(() => expect(result.current.quote?.quoteHash).toBe("c".repeat(64)));
    expect(staleSignal?.aborted).toBe(true);

    await act(async () => stale.resolve(createQuote(50000, "s")));
    expect(result.current.quote?.quoteHash).toBe("c".repeat(64));
  });

  it("shows the backend error message", async () => {
    const config = { headers: new AxiosHeaders() };
    vi.spyOn(ordersApi, "quote").mockRejectedValue(
      new AxiosError("Request failed", "ERR_BAD_REQUEST", config, undefined, {
        status: 400,
        statusText: "",
        headers: {},
        config,
        data: { statusCode: 400, code: "PAPER_VOUCHER_X", message: "Đơn 0 đồng không dùng voucher" }
      } as AxiosResponse)
    );
    const { result } = renderHook(() => usePaperVoucherOrderQuote(createDto(1)), {
      wrapper: createWrapper()
    });

    await waitFor(() => expect(result.current.errorMessage).toBe("Đơn 0 đồng không dùng voucher"));
    expect(result.current).toMatchObject({ isReady: false, isLoading: false, quote: undefined });
  });

  it("replaces the quote for the submitted selection only", async () => {
    vi.spyOn(ordersApi, "quote").mockResolvedValue(createQuote(0));
    const { result, rerender } = renderHook(
      ({ dto }: { dto: OrderQuoteDto | null }) => usePaperVoucherOrderQuote(dto),
      { wrapper: createWrapper(), initialProps: { dto: createDto(1) as OrderQuoteDto | null } }
    );
    await waitFor(() => expect(result.current.isReady).toBe(true));

    act(() => result.current.replaceQuote(createQuote(10000, "b"), result.current.requestKey));
    expect(result.current.quote).toMatchObject({
      finalOrderTotal: 10000,
      quoteHash: "b".repeat(64)
    });

    rerender({ dto: createDto(2) });
    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.quote?.quoteHash).toBe("a".repeat(64));

    // Quay lại lựa chọn cũ: báo giá thay thế đã bỏ, lấy báo giá mới từ backend.
    rerender({ dto: createDto(1) });
    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.quote?.quoteHash).toBe("a".repeat(64));
  });
});
