import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ordersApi, type OrderQuoteDto } from "@renderer/api/orders.api";
import type { PaperVoucherOrderQuote } from "@shared/types";
import {
  PAPER_VOUCHER_QUOTE_DEBOUNCE_MS,
  usePaperVoucherOrderQuote
} from "./usePaperVoucherOrderQuote";

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

/** Vé 100.000đ; voucher trả `100.000 − remainingPayable`, khách trả thêm `remainingPayable`. */
const createQuote = (remainingPayable: number, hash = "a"): PaperVoucherOrderQuote => ({
  businessDate: "2026-10-30",
  orderTotal: 100000,
  orderDiscount: 0,
  voucherQuantity: 1,
  faceValueTotal: 100000,
  voucherApplied: 100000 - remainingPayable,
  remainingPayable,
  excessAmount: 0,
  lines: [],
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

  it("waits for the selection to settle before quoting, even with rapid changes", async () => {
    vi.useFakeTimers();
    try {
      const quoteSpy = vi.spyOn(ordersApi, "quote").mockResolvedValue(createQuote(0));
      const { result, rerender } = renderHook(
        ({ dto }: { dto: OrderQuoteDto | null }) => usePaperVoucherOrderQuote(dto),
        { wrapper: createWrapper(), initialProps: { dto: null as OrderQuoteDto | null } }
      );

      // Thu ngân đổi số tờ liên tục (mỗi lần cách nhau < debounce): chưa gọi API.
      for (const quantity of [1, 2, 3, 2, 3]) {
        rerender({ dto: createDto(quantity) });
        await act(async () => {
          await vi.advanceTimersByTimeAsync(PAPER_VOUCHER_QUOTE_DEBOUNCE_MS - 50);
        });
      }
      expect(quoteSpy).not.toHaveBeenCalled();
      expect(result.current).toMatchObject({ isLoading: true, quote: undefined });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(PAPER_VOUCHER_QUOTE_DEBOUNCE_MS);
      });
      expect(quoteSpy).toHaveBeenCalledTimes(1);
      expect(quoteSpy).toHaveBeenCalledWith(createDto(3), expect.anything());
    } finally {
      vi.useRealTimers();
    }
  });

  it("cancels the pending request as soon as the selection changes", async () => {
    const stale = deferred<PaperVoucherOrderQuote>();
    const quoteSpy = vi.spyOn(ordersApi, "quote").mockReturnValue(stale.promise);
    const { result, rerender } = renderHook(
      ({ dto }: { dto: OrderQuoteDto | null }) => usePaperVoucherOrderQuote(dto),
      { wrapper: createWrapper(), initialProps: { dto: createDto(1) as OrderQuoteDto | null } }
    );
    await waitFor(() => expect(quoteSpy).toHaveBeenCalledTimes(1));
    const staleSignal = quoteSpy.mock.calls[0][1];

    // Không chờ hết debounce của lựa chọn mới mới hủy request cũ.
    rerender({ dto: createDto(2) });
    expect(staleSignal?.aborted).toBe(true);
    expect(result.current).toMatchObject({ isLoading: true, quote: undefined });
  });

  it("aborts the request and does not quote again when the voucher is cleared", async () => {
    const pending = deferred<PaperVoucherOrderQuote>();
    const quoteSpy = vi.spyOn(ordersApi, "quote").mockReturnValue(pending.promise);
    const { result, rerender } = renderHook(
      ({ dto }: { dto: OrderQuoteDto | null }) => usePaperVoucherOrderQuote(dto),
      { wrapper: createWrapper(), initialProps: { dto: createDto(1) as OrderQuoteDto | null } }
    );
    await waitFor(() => expect(quoteSpy).toHaveBeenCalledTimes(1));
    const signal = quoteSpy.mock.calls[0][1];

    rerender({ dto: null });
    expect(signal?.aborted).toBe(true);
    expect(result.current).toMatchObject({
      isLoading: false,
      isReady: false,
      quote: undefined,
      errorMessage: undefined
    });

    await act(async () => pending.resolve(createQuote(0)));
    expect(result.current.quote).toBeUndefined();

    // Chọn lựa chọn khác ngay sau khi bỏ: chỉ báo giá lựa chọn mới.
    quoteSpy.mockResolvedValue(createQuote(20000, "n"));
    rerender({ dto: createDto(2) });
    await waitFor(() => expect(result.current.quote?.quoteHash).toBe("n".repeat(64)));
    expect(quoteSpy).toHaveBeenCalledTimes(2);
    expect(quoteSpy).toHaveBeenLastCalledWith(createDto(2), expect.anything());
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
      remainingPayable: 10000,
      quoteHash: "b".repeat(64)
    });
    expect(result.current.isReplaced).toBe(true);

    rerender({ dto: createDto(2) });
    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.quote?.quoteHash).toBe("a".repeat(64));
    expect(result.current.isReplaced).toBe(false);

    // Quay lại lựa chọn cũ: báo giá thay thế đã bỏ, lấy báo giá mới từ backend.
    rerender({ dto: createDto(1) });
    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.quote?.quoteHash).toBe("a".repeat(64));
  });
});
