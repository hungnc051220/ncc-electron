import { ordersApi } from "@renderer/api/orders.api";
import { ordersKeys } from "@renderer/hooks/orders/keys";
import type { OrderDetailProps } from "@shared/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useOrderDetailView } from "./useOrderDetailView";

type Deferred = {
  resolve: (detail: OrderDetailProps) => void;
  reject: (error: unknown) => void;
};

const makeDetail = (
  id: number,
  orderTotal: number,
  paperVoucher: OrderDetailProps["paperVoucher"]
) => ({ order: { id, orderTotal }, paperVoucher }) as OrderDetailProps;

/** Giống cấu hình app: cache chi tiết đơn còn "fresh" 60 s nếu không ghi đè. */
const createQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 60 * 1000 } } });

/** Mỗi lần gọi API chi tiết đơn trả về một promise test tự quyết định lúc nào xong. */
const mockDeferredGetDetail = () => {
  const pending = new Map<number, Deferred>();
  const spy = vi.spyOn(ordersApi, "getDetail").mockImplementation(
    (id: number) =>
      new Promise<OrderDetailProps>((resolve, reject) => {
        pending.set(id, { resolve, reject });
      })
  );
  return { spy, pending };
};

const renderView = (
  queryClient: QueryClient,
  initialProps: { orderId: number; fallback?: OrderDetailProps | null }
) =>
  renderHook(({ orderId, fallback }) => useOrderDetailView(orderId, fallback), {
    initialProps,
    wrapper: ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  });

afterEach(() => vi.restoreAllMocks());

describe("useOrderDetailView", () => {
  it("never shows the previous order when switching quickly and its response arrives late", async () => {
    const { pending } = mockDeferredGetDetail();
    const queryClient = createQueryClient();
    const view = renderView(queryClient, {
      orderId: 1,
      fallback: makeDetail(1, 100000, undefined)
    });
    await waitFor(() => expect(pending.has(1)).toBe(true));

    view.rerender({ orderId: 2, fallback: makeDetail(2, 50000, undefined) });
    await waitFor(() => expect(pending.has(2)).toBe(true));
    await act(async () => pending.get(1)?.resolve(makeDetail(1, 100000, null)));

    expect(view.result.current.status).toBe("preview");
    expect(view.result.current.detail?.order.id).toBe(2);

    const expectedDetail = makeDetail(2, 50000, null);
    await act(async () => pending.get(2)?.resolve(expectedDetail));

    await waitFor(() => expect(view.result.current.status).toBe("ready"));
    expect(view.result.current.detail).toEqual(expectedDetail);
  });

  it("ignores a list row that belongs to another order", async () => {
    mockDeferredGetDetail();
    const queryClient = createQueryClient();
    const view = renderView(queryClient, {
      orderId: 2,
      fallback: makeDetail(1, 100000, undefined)
    });

    expect(view.result.current).toMatchObject({ status: "loading", detail: null });
  });

  it("reloads a detail cached less than 60 s ago and treats the cache only as a preview", async () => {
    const { spy, pending } = mockDeferredGetDetail();
    const queryClient = createQueryClient();
    const inputCached = makeDetail(7, 100000, null);
    queryClient.setQueryData(ordersKeys.getDetail(7), inputCached, {
      updatedAt: Date.now() - 5000
    });

    const view = renderView(queryClient, { orderId: 7 });

    expect(view.result.current).toMatchObject({ status: "preview", detail: inputCached });
    await waitFor(() => expect(spy).toHaveBeenCalledWith(7));

    const expectedDetail = makeDetail(7, 100000, {
      status: "cancelled"
    } as NonNullable<OrderDetailProps["paperVoucher"]>);
    await act(async () => pending.get(7)?.resolve(expectedDetail));

    await waitFor(() => expect(view.result.current.status).toBe("ready"));
    expect(view.result.current.detail?.paperVoucher?.status).toBe("cancelled");
  });

  it("keeps the list row as a preview with the error when the detail fails to load", async () => {
    const { pending } = mockDeferredGetDetail();
    const queryClient = createQueryClient();
    const inputFallback = makeDetail(3, 80000, undefined);
    const view = renderView(queryClient, { orderId: 3, fallback: inputFallback });
    await waitFor(() => expect(pending.has(3)).toBe(true));

    const inputError = new Error("Network Error");
    await act(async () => pending.get(3)?.reject(inputError));

    await waitFor(() => expect(view.result.current.error).toBe(inputError));
    expect(view.result.current).toMatchObject({ status: "preview", detail: inputFallback });
  });

  it("reports an error when there is nothing to show for the order", async () => {
    const { pending } = mockDeferredGetDetail();
    const queryClient = createQueryClient();
    const view = renderView(queryClient, { orderId: 4 });
    await waitFor(() => expect(pending.has(4)).toBe(true));

    await act(async () => pending.get(4)?.reject(new Error("Not found")));

    await waitFor(() => expect(view.result.current.status).toBe("error"));
    expect(view.result.current.detail).toBeNull();
  });
});
