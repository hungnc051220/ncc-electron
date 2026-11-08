import { ordersApi, type OrderQuoteDto } from "@renderer/api/orders.api";
import { getApiErrorCode, getApiErrorMessage } from "@renderer/lib/apiError";
import type { PaperVoucherOrderQuote } from "@shared/types";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ordersKeys } from "./keys";

export const PAPER_VOUCHER_QUOTE_DEBOUNCE_MS = 300;
const QUOTE_ERROR_FALLBACK = "Không tính được số tiền khách cần thanh toán thêm";

/**
 * Báo giá đơn có voucher giấy do backend tính. `dto = null` khi không cần báo giá (chưa chọn
 * voucher giấy): không gọi API.
 *
 * - So sánh body theo nội dung và debounce trước khi gọi API, nên đổi lựa chọn liên tục chỉ gọi một
 *   lần. Mỗi lựa chọn là một query key: đổi lựa chọn thì React Query hủy request cũ qua `signal` và
 *   chỉ hiển thị báo giá khớp lựa chọn hiện tại (response đến muộn của lựa chọn cũ bị bỏ qua).
 * - Bỏ chọn voucher (`dto = null`) hủy request ngay, không chờ debounce.
 * - `replaceQuote`: hiển thị báo giá backend trả kèm lỗi 409 cho đúng lựa chọn đã gửi; đổi lựa
 *   chọn thì bỏ báo giá thay thế.
 */
export const usePaperVoucherOrderQuote = (dto: OrderQuoteDto | null) => {
  const selectionKey = dto ? JSON.stringify(dto) : null;
  const [debouncedKey, setDebouncedKey] = useState(selectionKey);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKey(selectionKey), PAPER_VOUCHER_QUOTE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [selectionKey]);

  // Chỉ báo giá khi lựa chọn đã đứng yên. Đang đổi hoặc vừa bỏ chọn: không có query nào được theo
  // dõi, nên request của lựa chọn cũ bị hủy ngay thay vì chờ hết debounce.
  const isSettled = selectionKey === debouncedKey;
  const requestKey = isSettled ? selectionKey : null;
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
  const errorCode = errorMessage ? getApiErrorCode(query.error) : undefined;
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
    /** Mã lỗi nghiệp vụ của lần báo giá lỗi (vd. `U22_PRICE_CHANGED`). */
    errorCode,
    isReady: !!quote,
    /** Báo giá đang hiển thị là báo giá mới backend trả kèm lỗi 409 (số tiền vừa đổi). */
    isReplaced: !!quote && !!replacedQuote,
    /** Khóa của lựa chọn ứng với báo giá đang hiển thị; truyền lại cho `replaceQuote`. */
    requestKey,
    /** Khóa lựa chọn hiện tại (chưa debounce); đổi nghĩa là thu ngân vừa đổi lựa chọn. */
    selectionKey,
    replaceQuote,
    retry
  };
};

export type PaperVoucherOrderQuoteState = ReturnType<typeof usePaperVoucherOrderQuote>;
