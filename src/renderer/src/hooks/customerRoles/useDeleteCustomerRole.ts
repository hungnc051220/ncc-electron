import { customerRolesApi } from "@renderer/api/customerRoles.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { customerRolesKeys } from "./keys";

export const useDeleteCustomerRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: customerRolesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: customerRolesKeys.all
      });
    }
  });
};
