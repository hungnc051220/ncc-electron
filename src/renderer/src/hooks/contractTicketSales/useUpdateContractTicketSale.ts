import {
  ContractTicketSaleDto,
  contractTicketSalesApi
} from "@renderer/api/contractTicketSales.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { contractTicketSalesKeys } from "./keys";

export const useUpdateContractTicketSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: ContractTicketSaleDto }) =>
      contractTicketSalesApi.update(id, dto),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: contractTicketSalesKeys.all
      });
    }
  });
};
