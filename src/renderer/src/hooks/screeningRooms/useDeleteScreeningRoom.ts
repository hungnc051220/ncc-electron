import { screeningRoomsApi } from "@renderer/api/screeningRooms.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { screeningRoomsKeys } from "./keys";

export const useDeleteScreeningRoom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: screeningRoomsApi.delete,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: screeningRoomsKeys.all
      });
    }
  });
};
