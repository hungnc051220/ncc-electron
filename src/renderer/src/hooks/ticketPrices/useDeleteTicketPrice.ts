import { ticketPricesApi } from "@renderer/api/ticketPrices.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketPricesKeys } from "./keys";

export const useDeleteTicketPrice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ticketPricesApi.delete,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ticketPricesKeys.all
      });
    }
  });
};
