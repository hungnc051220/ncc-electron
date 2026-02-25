import {
  contractTicketSalesApi,
  SetSeatsContractTicketSaleDto
} from "@renderer/api/contractTicketSales.api";
import { useMutation } from "@tanstack/react-query";

export const useSetSeatsContractTicketSale = () => {
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: SetSeatsContractTicketSaleDto }) =>
      contractTicketSalesApi.setSeats(id, dto)
  });
};
