import { planScreeningsApi } from "@renderer/api/planScreenings.api";
import { useQuery } from "@tanstack/react-query";
import { planScreeningsKeys } from "./keys";

/**
 * "Đối chiếu giá suất chiếu" trong một ngày hoặc khoảng ngày (POST chỉ đọc, không ghi gì ở backend). Mặc định chỉ suất
 * tương lai; `includePast` để tra cứu lịch sử. Chức năng điều chỉnh giá suất (REPRICE-B) đang tạm ngừng nên
 * không có mutation ghi.
 */
export const useRepricingPreview = (
  query: { fromDate: string; toDate: string; includePast: boolean } | null
) =>
  useQuery({
    queryKey: planScreeningsKeys.repricingPreview(
      query?.fromDate ?? "",
      query?.toDate ?? "",
      query?.includePast ?? false
    ),
    queryFn: () => planScreeningsApi.previewRepricing(query!),
    enabled: Boolean(query?.fromDate && query?.toDate),
    // Đối soát với cấu hình hiện tại: không giữ kết quả cũ khi đổi khoảng ngày, luôn tải lại khi mở.
    staleTime: 0,
    refetchOnWindowFocus: false
  });
