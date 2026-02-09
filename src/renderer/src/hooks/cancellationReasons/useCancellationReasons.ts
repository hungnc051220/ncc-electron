import { cancellationReasonsApi } from "@renderer/api/cancellationReasons.api";
import { UsersQuery } from "@renderer/api/users.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { cancellationReasonsKeys } from "./keys";

export const useCancellationReasons = (params: UsersQuery) =>
  useQuery({
    queryKey: cancellationReasonsKeys.getAll(params),
    queryFn: () => cancellationReasonsApi.getAll(params),
    placeholderData: keepPreviousData
  });
