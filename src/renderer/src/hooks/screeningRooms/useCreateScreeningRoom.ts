import { screeningRoomsApi } from "@renderer/api/screeningRooms.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { screeningRoomsKeys } from "./keys";

export const useCreateScreeningRoom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: screeningRoomsApi.create,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: screeningRoomsKeys.all
      });
    }
  });
};
