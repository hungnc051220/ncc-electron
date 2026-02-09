import { TicketPriceDto, ticketPricesApi } from "@renderer/api/ticketPrices.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketPricesKeys } from "./keys";

export const useUpdateTicketPrice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: TicketPriceDto }) =>
      ticketPricesApi.update(id, dto),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ticketPricesKeys.all
      });
    }
  });
};
