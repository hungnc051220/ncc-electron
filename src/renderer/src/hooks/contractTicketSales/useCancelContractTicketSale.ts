import {
  CancelContactTicketSaleDto,
  contractTicketSalesApi
} from "@renderer/api/contractTicketSales.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { contractTicketSalesKeys } from "./keys";

export const useCancelContractTicketSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CancelContactTicketSaleDto) => contractTicketSalesApi.cancel(dto),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: contractTicketSalesKeys.all
      });
    }
  });
};
