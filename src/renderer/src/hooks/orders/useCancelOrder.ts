import { ordersApi } from "@renderer/api/orders.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { paperVoucherKeys } from "../paperVouchers/keys";
import { ordersKeys } from "./keys";

export const useCancelOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ordersApi.cancel,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ordersKeys.all
      });
      // Hủy đơn có voucher giấy đang chờ QR trả lại voucher; FE không biết trước đơn có voucher hay
      // không. Chỉ query lô đang hiển thị mới tải lại.
      queryClient.invalidateQueries({
        queryKey: paperVoucherKeys.all
      });
    }
  });
};
