import { customerApi, CustomerQuery } from "@renderer/api/customer.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

export const useCustomer = (params: CustomerQuery) =>
  useQuery({
    queryKey: ["customers", params],
    queryFn: () => customerApi.getAll(params),
    placeholderData: keepPreviousData,
    enabled: false
  });
