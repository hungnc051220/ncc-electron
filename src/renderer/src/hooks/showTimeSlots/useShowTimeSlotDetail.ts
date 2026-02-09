import { showTimeSlotsApi } from "@renderer/api/showTimeSlots.api";
import { useQuery } from "@tanstack/react-query";
import { showTimeSlotsKeys } from "./keys";

export const useShowTimeSlotDetail = (id: number) =>
  useQuery({
    queryKey: showTimeSlotsKeys.getDetail(id),
    queryFn: () => showTimeSlotsApi.getDetail(id)
  });
