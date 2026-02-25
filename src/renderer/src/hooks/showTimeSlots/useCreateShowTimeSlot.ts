import { showTimeSlotsApi } from "@renderer/api/showTimeSlots.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showTimeSlotsKeys } from "./keys";

export const useCreateShowTimeSlot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: showTimeSlotsApi.create,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: showTimeSlotsKeys.all
      });
    }
  });
};
