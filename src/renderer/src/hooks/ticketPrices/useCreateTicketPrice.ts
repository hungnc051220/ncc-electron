import { ticketPricesApi } from "@renderer/api/ticketPrices.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketPricesKeys } from "./keys";

export const useCreateTicketPrice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ticketPricesApi.create,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ticketPricesKeys.all
      });
    }
  });
};
