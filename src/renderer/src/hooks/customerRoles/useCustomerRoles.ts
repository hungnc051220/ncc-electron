import { customerRolesApi } from "@renderer/api/customerRoles.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { customerRolesKeys } from "./keys";

export const useCustomerRoles = () =>
  useQuery({
    queryKey: customerRolesKeys.all,
    queryFn: () => customerRolesApi.getAll(),
    placeholderData: keepPreviousData
  });
