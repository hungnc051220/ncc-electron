import { paperVouchersApi } from "@renderer/api/paperVouchers.api";
import type { PaperVoucherBatch, PaperVoucherBatchQuery } from "@shared/types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { paperVoucherKeys } from "./keys";

/**
 * Toàn bộ lô (không phân trang): dùng cho lựa chọn bộ lọc và màn hình POS.
 * `alwaysRefetch`: POS cần số lượng còn lại mới nhất mỗi lần mở, không dùng cache còn hạn.
 */
export const usePaperVoucherBatches = (enabled = true, alwaysRefetch = false) =>
  useQuery({
    queryKey: paperVoucherKeys.list(),
    queryFn: paperVouchersApi.getAll,
    placeholderData: keepPreviousData,
    enabled,
    ...(alwaysRefetch && { refetchOnMount: "always" as const })
  });

/** Một trang lô theo bộ lọc/sắp xếp phía server. */
export const usePaperVoucherBatchPage = (query: PaperVoucherBatchQuery, enabled = true) =>
  useQuery({
    queryKey: paperVoucherKeys.page(query),
    queryFn: () => paperVouchersApi.getPage(query),
    placeholderData: keepPreviousData,
    enabled
  });

/** Thống kê toàn bộ lô cho 4 thẻ tổng quan (không áp bộ lọc của bảng). */
export const usePaperVoucherSummary = (enabled = true) =>
  useQuery({
    queryKey: paperVoucherKeys.summary(),
    queryFn: () => paperVouchersApi.getSummary(),
    placeholderData: keepPreviousData,
    enabled
  });

/** Chi tiết lô mới nhất; hiển thị ngay dữ liệu dòng đang có trong bảng trong lúc tải. */
export const usePaperVoucherBatch = (batch: PaperVoucherBatch, enabled = true) =>
  useQuery({
    queryKey: paperVoucherKeys.detail(batch.id),
    queryFn: () => paperVouchersApi.getById(batch.id),
    placeholderData: batch,
    enabled
  });
