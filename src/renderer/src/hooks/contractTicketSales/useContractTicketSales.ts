import { contractTicketSalesApi } from "@renderer/api/contractTicketSales.api";
import { UsersQuery } from "@renderer/api/users.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { contractTicketSalesKeys } from "./keys";

export const useContractTicketSales = (params: UsersQuery) =>
  useQuery({
    queryKey: contractTicketSalesKeys.getAll(params),
    queryFn: () => contractTicketSalesApi.getAll(params),
    placeholderData: keepPreviousData
  });
