import { usersApi } from "@renderer/api/users.api";
import { useQuery } from "@tanstack/react-query";
import { usersKeys } from "./keys";

export const useUserDetail = (id: number) =>
  useQuery({
    queryKey: usersKeys.getDetail(id),
    queryFn: () => usersApi.getDetail(id),
    enabled: !!id
  });
