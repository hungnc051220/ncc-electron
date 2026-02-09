import { seatTypesApi } from "@renderer/api/seatTypes.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { seatTypesKeys } from "./keys";

export const useCreateSeatType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: seatTypesApi.create,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: seatTypesKeys.all
      });
    }
  });
};
