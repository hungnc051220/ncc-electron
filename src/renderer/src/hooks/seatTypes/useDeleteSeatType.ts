import { seatTypesApi } from "@renderer/api/seatTypes.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { seatTypesKeys } from "./keys";

export const useDeleteSeatType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: seatTypesApi.delete,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: seatTypesKeys.all
      });
    }
  });
};
