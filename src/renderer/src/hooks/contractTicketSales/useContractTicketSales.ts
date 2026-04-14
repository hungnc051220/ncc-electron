import {
  contractTicketSalesApi,
  ContractTicketSalesQuery
} from "@renderer/api/contractTicketSales.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { contractTicketSalesKeys } from "./keys";

export const useContractTicketSales = (params: ContractTicketSalesQuery) =>
  useQuery({
    queryKey: contractTicketSalesKeys.getAll(params),
    queryFn: () => contractTicketSalesApi.getAll(params),
    placeholderData: keepPreviousData
  });
