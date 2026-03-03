import { ScreeningRoomChairsQuery, screeningRoomsApi } from "@renderer/api/screeningRooms.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { screeningRoomsKeys } from "./keys";

export const useScreeningRoomChairs = (params: ScreeningRoomChairsQuery) =>
  useQuery({
    queryKey: screeningRoomsKeys.getChairs(params),
    queryFn: () => screeningRoomsApi.getChairs(params),
    placeholderData: keepPreviousData
  });
