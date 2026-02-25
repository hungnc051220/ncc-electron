import { usersApi } from "@renderer/api/users.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersKeys } from "./keys";

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.delete,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: usersKeys.all
      });
    }
  });
};
