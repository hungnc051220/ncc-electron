import { useQuery } from "@tanstack/react-query";
import { customerRolesKeys } from "./keys";
import { customerRolesApi } from "@renderer/api/customerRoles.api";

export const useCustomerRoleDetail = (id: number) =>
  useQuery({
    queryKey: customerRolesKeys.getDetail(id),
    queryFn: () => customerRolesApi.getDetail(id),
    enabled: !!id
  });
