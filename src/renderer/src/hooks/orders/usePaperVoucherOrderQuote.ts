import { ordersApi, type OrderQuoteDto } from "@renderer/api/orders.api";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import type { PaperVoucherOrderQuote } from "@shared/types";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useDebounce } from "../useDebounce";
import { ordersKeys } from "./keys";

export const PAPER_VOUCHER_QUOTE_DEBOUNCE_MS = 300;
const QUOTE_ERROR_FALLBACK = "Không tính được số tiền khách cần trả";

/**
 * Báo giá đơn có voucher giấy do backend tính. `dto = null` khi không cần báo giá.
 *
 * - So sánh body theo nội dung và debounce trước khi gọi API; đổi lựa chọn thì React Query bỏ kết
 *   quả cũ và hủy request đang chạy qua `signal`.
 * - `replaceQuote`: hiển thị báo giá backend trả kèm lỗi 409 cho đúng lựa chọn đã gửi; đổi lựa
 *   chọn thì bỏ báo giá thay thế.
 */
export const usePaperVoucherOrderQuote = (dto: OrderQuoteDto | null) => {
  const selectionKey = dto ? JSON.stringify(dto) : null;
  const requestKey = useDebounce(selectionKey, PAPER_VOUCHER_QUOTE_DEBOUNCE_MS);
  const isSettled = selectionKey === requestKey;
  const requestDto = useMemo<OrderQuoteDto | null>(
    () => (requestKey ? JSON.parse(requestKey) : null),
    [requestKey]
  );
  const [replaced, setReplaced] = useState<{ key: string; quote: PaperVoucherOrderQuote } | null>(
    null
  );

  if (replaced && replaced.key !== requestKey) {
    setReplaced(null);
  }

  const query = useQuery({
    queryKey: ordersKeys.quote(requestDto),
    queryFn: ({ signal }) => ordersApi.quote(requestDto as OrderQuoteDto, signal),
    enabled: requestDto !== null,
    retry: false,
    // Chỉ gọi lại khi lựa chọn đổi hoặc thu ngân bấm thử lại, tránh số tiền tự đổi khi đang thu.
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });

  const replacedQuote = replaced && replaced.key === requestKey ? replaced.quote : undefined;
  const isActive = selectionKey !== null;
  const isLoading =
    isActive && (!isSettled || (!replacedQuote && (query.isPending || query.isFetching)));
  const errorMessage =
    isActive && !isLoading && !replacedQuote && query.error
      ? getApiErrorMessage(query.error, QUOTE_ERROR_FALLBACK)
      : undefined;
  const quote = isActive && !isLoading && !errorMessage ? (replacedQuote ?? query.data) : undefined;

  const replaceQuote = useCallback((nextQuote: PaperVoucherOrderQuote, key: string | null) => {
    if (key) setReplaced({ key, quote: nextQuote });
  }, []);
  const { refetch } = query;
  const retry = useCallback(() => {
    setReplaced(null);
    void refetch();
  }, [refetch]);

  return {
    quote,
    isLoading,
    errorMessage,
    isReady: !!quote,
    /** Khóa của lựa chọn ứng với báo giá đang hiển thị; truyền lại cho `replaceQuote`. */
    requestKey,
    /** Khóa lựa chọn hiện tại (chưa debounce); đổi nghĩa là thu ngân vừa đổi lựa chọn. */
    selectionKey,
    replaceQuote,
    retry
  };
};

export type PaperVoucherOrderQuoteState = ReturnType<typeof usePaperVoucherOrderQuote>;
