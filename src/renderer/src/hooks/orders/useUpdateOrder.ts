import { ordersApi, OrderUpdateStatusDto } from "@renderer/api/orders.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { paperVoucherKeys } from "../paperVouchers/keys";
import { ordersKeys } from "./keys";

export const useUpdateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: OrderUpdateStatusDto }) =>
      ordersApi.update(id, dto),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ordersKeys.all
      });
      // Đóng QR/QR lỗi của đơn có voucher giấy trả lại voucher đang giữ. Chỉ query lô đang hiển thị
      // mới tải lại, nên đơn thường không phát sinh request mới.
      queryClient.invalidateQueries({
        queryKey: paperVoucherKeys.all
      });
    }
  });
};
