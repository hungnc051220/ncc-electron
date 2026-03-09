import { screeningRoomsApi } from "@renderer/api/screeningRooms.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { screeningRoomsKeys } from "./keys";

export const useCreateScreeningRoomChairs = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: screeningRoomsApi.createChairs,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: screeningRoomsKeys.allChairs
      });
    }
  });
};
