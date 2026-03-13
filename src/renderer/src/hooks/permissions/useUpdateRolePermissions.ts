import { customerRolesApi } from "@renderer/api/customerRoles.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useUpdateRolePermissions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: customerRolesApi.updateRolePermissions,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
    }
  });
};
