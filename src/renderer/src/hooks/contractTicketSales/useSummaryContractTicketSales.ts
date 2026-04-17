import {
  contractTicketSalesApi,
  ContractTicketSalesQuery
} from "@renderer/api/contractTicketSales.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { contractTicketSalesKeys } from "./keys";

export const useSummaryContractTicketSales = (params: ContractTicketSalesQuery) =>
  useQuery({
    queryKey: contractTicketSalesKeys.getSummary(params),
    queryFn: () => contractTicketSalesApi.getSummary(params),
    placeholderData: keepPreviousData
  });
