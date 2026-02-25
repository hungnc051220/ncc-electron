import { usersApi } from "@renderer/api/users.api";
import { useMutation } from "@tanstack/react-query";

export const useChangePasswordUser = () => {
  return useMutation({
    mutationFn: usersApi.changePassword
  });
};
