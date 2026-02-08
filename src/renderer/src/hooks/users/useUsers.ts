import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { usersKeys } from "./keys";
import { usersApi, UsersQuery } from "@renderer/api/users.api";

export const useUsers = (params: UsersQuery) =>
  useQuery({
    queryKey: usersKeys.getAll(params),
    queryFn: () => usersApi.getAll(params),
    placeholderData: keepPreviousData
  });
