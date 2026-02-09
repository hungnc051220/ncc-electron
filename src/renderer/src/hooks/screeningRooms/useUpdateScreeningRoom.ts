import { ScreeningRoomDto, screeningRoomsApi } from "@renderer/api/screeningRooms.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { screeningRoomsKeys } from "./keys";

export const useUpdateScreeningRoom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: ScreeningRoomDto }) =>
      screeningRoomsApi.update(id, dto),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: screeningRoomsKeys.all
      });
    }
  });
};
