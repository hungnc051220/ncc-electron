import { CustomerRoleMenuDto, customerRolesApi } from "@renderer/api/customerRoles.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

export const useCustomerRoleMenu = (dto?: CustomerRoleMenuDto) =>
  useQuery({
    queryKey: [`customer-role-menu`, JSON.stringify(dto)],
    queryFn: () => customerRolesApi.getMenu(dto),
    placeholderData: keepPreviousData,
    enabled: !!dto
  });
