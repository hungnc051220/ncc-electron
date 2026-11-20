import { seatIconConfigsApi } from "@renderer/api/seatIconConfigs.api";
import type { SeatIconConfigQuery } from "@shared/types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { seatIconConfigKeys } from "./keys";

/** Một trang cấu hình theo bộ lọc phía server (phạm vi, trạng thái, từ khóa). */
export const useSeatIconConfigPage = (query: SeatIconConfigQuery, enabled = true) =>
  useQuery({
    queryKey: seatIconConfigKeys.page(query),
    queryFn: () => seatIconConfigsApi.getPage(query),
    placeholderData: keepPreviousData,
    enabled
  });

/** Toàn bộ cấu hình: khóa phạm vi đã có cấu hình trong form và mô tả cấu hình thay thế khi tắt/xóa. */
export const useAllSeatIconConfigs = (enabled = true) =>
  useQuery({
    queryKey: seatIconConfigKeys.list(),
    queryFn: seatIconConfigsApi.getAll,
    enabled
  });
