import { ShowTimeSlotDto, showTimeSlotsApi } from "@renderer/api/showTimeSlots.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showTimeSlotsKeys } from "./keys";

export const useUpdateShowTimeSlot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: ShowTimeSlotDto }) =>
      showTimeSlotsApi.update(id, dto),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: showTimeSlotsKeys.all
      });
    }
  });
};
