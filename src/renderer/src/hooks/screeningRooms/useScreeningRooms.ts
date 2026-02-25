import { screeningRoomsApi, ScreeningRoomsQuery } from "@renderer/api/screeningRooms.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { screeningRoomsKeys } from "./keys";

export const useScreeningRooms = (params: ScreeningRoomsQuery) =>
  useQuery({
    queryKey: screeningRoomsKeys.getAll(params),
    queryFn: () => screeningRoomsApi.getAll(params),
    placeholderData: keepPreviousData
  });
