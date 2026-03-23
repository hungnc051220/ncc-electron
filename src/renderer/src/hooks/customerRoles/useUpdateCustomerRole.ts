import { CustomerRoleDto, customerRolesApi } from "@renderer/api/customerRoles.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { customerRolesKeys } from "./keys";

export const useUpdateCustomerRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: CustomerRoleDto }) =>
      customerRolesApi.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: customerRolesKeys.all
      });
    }
  });
};
