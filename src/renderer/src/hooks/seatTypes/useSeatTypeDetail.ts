import { seatTypesApi } from "@renderer/api/seatTypes.api";
import { useQuery } from "@tanstack/react-query";
import { seatTypesKeys } from "./keys";

export const useSeatTypeDetail = (id: number) =>
  useQuery({
    queryKey: seatTypesKeys.getDetail(id),
    queryFn: () => seatTypesApi.getDetail(id),
    enabled: !!id
  });
