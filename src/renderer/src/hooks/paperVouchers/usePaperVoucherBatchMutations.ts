import { paperVouchersApi } from "@renderer/api/paperVouchers.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { paperVoucherKeys } from "./keys";

/** Lô đã bị xóa (404) hoặc vừa thay đổi ở nơi khác (409): tải lại để UI không dùng dữ liệu cũ. */
const STALE_BATCH_STATUSES = [404, 409];

const useInvalidatePaperVouchers = () => {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: paperVoucherKeys.all });

  return {
    onSuccess: invalidate,
    onError: (error: unknown) => {
      if (axios.isAxiosError(error) && STALE_BATCH_STATUSES.includes(error.response?.status ?? 0)) {
        void invalidate();
      }
    }
  };
};

export const useCreatePaperVoucherBatch = () => {
  const handlers = useInvalidatePaperVouchers();

  return useMutation({
    mutationFn: paperVouchersApi.create,
    ...handlers
  });
};

export const useUpdatePaperVoucherBatch = () => {
  const handlers = useInvalidatePaperVouchers();

  return useMutation({
    mutationFn: paperVouchersApi.update,
    ...handlers
  });
};

export const useSetPaperVoucherBatchLocked = () => {
  const handlers = useInvalidatePaperVouchers();

  return useMutation({
    mutationFn: paperVouchersApi.setLocked,
    ...handlers
  });
};

export const useDeletePaperVoucherBatch = () => {
  const handlers = useInvalidatePaperVouchers();

  return useMutation({
    mutationFn: paperVouchersApi.delete,
    ...handlers
  });
};
