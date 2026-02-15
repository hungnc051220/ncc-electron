import { customerRolesApi } from "@renderer/api/customerRoles.api";
import { useMutation } from "@tanstack/react-query";

export const useUpdateCustomerRoleMenu = () => {
  return useMutation({
    mutationFn: customerRolesApi.updateMenu
  });
};
