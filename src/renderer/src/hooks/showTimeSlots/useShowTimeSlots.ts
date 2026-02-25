import { showTimeSlotsApi } from "@renderer/api/showTimeSlots.api";
import { UsersQuery } from "@renderer/api/users.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { showTimeSlotsKeys } from "./keys";

export const useShowTimeSlots = (params: UsersQuery) =>
  useQuery({
    queryKey: showTimeSlotsKeys.getAll(params),
    queryFn: () => showTimeSlotsApi.getAll(params),
    placeholderData: keepPreviousData
  });
