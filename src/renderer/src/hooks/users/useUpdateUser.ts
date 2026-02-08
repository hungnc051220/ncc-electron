import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersKeys } from "./keys";
import { UserDto, usersApi } from "@renderer/api/users.api";

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UserDto }) => usersApi.update(id, dto),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: usersKeys.all
      });
    }
  });
};
