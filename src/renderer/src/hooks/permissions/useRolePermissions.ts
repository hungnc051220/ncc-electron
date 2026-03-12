import { customerRolesApi } from "@renderer/api/customerRoles.api";
import type { GetRolePermissionsRequest } from "@shared/types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

export const useRolePermissions = (dto?: GetRolePermissionsRequest) =>
  useQuery({
    queryKey: ["role-permissions", JSON.stringify(dto)],
    queryFn: () => customerRolesApi.getRolePermissions(dto!),
    placeholderData: keepPreviousData,
    enabled: !!dto?.roleIds?.length
  });
