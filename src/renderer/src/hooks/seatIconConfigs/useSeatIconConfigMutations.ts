import { seatIconConfigsApi } from "@renderer/api/seatIconConfigs.api";
import { getApiErrorStatus } from "@renderer/lib/apiError";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { seatIconConfigKeys } from "./keys";

/** Cấu hình đã bị xóa (404) hoặc vừa thay đổi/trùng ở nơi khác (409): tải lại để UI không dùng dữ liệu cũ. */
const STALE_CONFIG_STATUSES = [404, 409];

const useInvalidateSeatIconConfigs = () => {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: seatIconConfigKeys.all });

  return {
    onSuccess: invalidate,
    onError: (error: unknown) => {
      if (STALE_CONFIG_STATUSES.includes(getApiErrorStatus(error) ?? 0)) {
        void invalidate();
      }
    }
  };
};

export const useCreateSeatIconConfig = () => {
  const handlers = useInvalidateSeatIconConfigs();

  return useMutation({ mutationFn: seatIconConfigsApi.create, ...handlers });
};

export const useUpdateSeatIconConfig = () => {
  const handlers = useInvalidateSeatIconConfigs();

  return useMutation({ mutationFn: seatIconConfigsApi.update, ...handlers });
};

export const useDeleteSeatIconConfig = () => {
  const handlers = useInvalidateSeatIconConfigs();

  return useMutation({ mutationFn: seatIconConfigsApi.delete, ...handlers });
};

/** Upload chỉ lưu ảnh trên Cloudinary, chưa đổi cấu hình nào nên không cần làm mới cache. */
export const useUploadSeatIconImage = () =>
  useMutation({ mutationFn: seatIconConfigsApi.uploadImage });
