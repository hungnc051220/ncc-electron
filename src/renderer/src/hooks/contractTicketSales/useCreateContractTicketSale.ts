import { contractTicketSalesApi } from "@renderer/api/contractTicketSales.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { contractTicketSalesKeys } from "./keys";

export const useCreateContractTicketSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: contractTicketSalesApi.create,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: contractTicketSalesKeys.all
      });
    }
  });
};
