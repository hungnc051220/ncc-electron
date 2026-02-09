import { SeatTypeDto, seatTypesApi } from "@renderer/api/seatTypes.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { seatTypesKeys } from "./keys";

export const useUpdateSeatType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: SeatTypeDto }) => seatTypesApi.update(id, dto),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: seatTypesKeys.all
      });
    }
  });
};
