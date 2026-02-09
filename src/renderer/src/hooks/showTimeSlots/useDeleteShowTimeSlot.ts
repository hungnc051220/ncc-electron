import { showTimeSlotsApi } from "@renderer/api/showTimeSlots.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showTimeSlotsKeys } from "./keys";

export const useDeleteShowTimeSlot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: showTimeSlotsApi.delete,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: showTimeSlotsKeys.all
      });
    }
  });
};
