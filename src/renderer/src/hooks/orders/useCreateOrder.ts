import { ordersApi } from "@renderer/api/orders.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { paperVoucherKeys } from "../paperVouchers/keys";
import { ordersKeys } from "./keys";

export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ordersApi.create,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ordersKeys.all
      });
    },

    // Đơn có voucher giấy (thành công hoặc bị từ chối) làm đổi số voucher còn lại của lô.
    onSettled: (_order, _error, dto) => {
      if (!dto.paperVouchers?.length) return;

      queryClient.invalidateQueries({
        queryKey: paperVoucherKeys.all
      });
    }
  });
};
