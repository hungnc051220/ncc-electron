import { customerRolesApi } from "@renderer/api/customerRoles.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

export const useCustomerRoles = () =>
  useQuery({
    queryKey: ["customer-roles"],
    queryFn: () => customerRolesApi.getAll(),
    placeholderData: keepPreviousData
  });
