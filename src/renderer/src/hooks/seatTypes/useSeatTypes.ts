import { seatTypesApi } from "@renderer/api/seatTypes.api";
import { UsersQuery } from "@renderer/api/users.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { seatTypesKeys } from "./keys";

export const useSeatTypes = (params: UsersQuery) =>
  useQuery({
    queryKey: seatTypesKeys.getAll(params),
    queryFn: () => seatTypesApi.getAll(params),
    placeholderData: keepPreviousData
  });
