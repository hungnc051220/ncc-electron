import { customerRolesApi } from "@renderer/api/customerRoles.api";
import { useMutation } from "@tanstack/react-query";

export const useUpdateRolePermissions = () =>
  useMutation({
    mutationFn: customerRolesApi.updateRolePermissions
  });
