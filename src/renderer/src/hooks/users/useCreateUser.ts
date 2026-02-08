import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersKeys } from "./keys";
import { usersApi } from "@renderer/api/users.api";

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.create,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: usersKeys.all
      });
    }
  });
};
