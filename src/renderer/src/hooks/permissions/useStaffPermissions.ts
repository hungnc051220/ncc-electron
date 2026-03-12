import { customerRolesApi } from "@renderer/api/customerRoles.api";
import type { GetStaffPermissionsRequest } from "@shared/types";
import { useQuery } from "@tanstack/react-query";

export const useStaffPermissions = (dto?: GetStaffPermissionsRequest) =>
  useQuery({
    queryKey: ["staff-permissions", dto?.userId],
    queryFn: () => customerRolesApi.getStaffPermissions(dto!),
    enabled: !!dto?.userId
  });
