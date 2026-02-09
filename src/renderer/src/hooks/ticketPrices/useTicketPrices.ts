import { ticketPricesApi } from "@renderer/api/ticketPrices.api";
import { UsersQuery } from "@renderer/api/users.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ticketPricesKeys } from "./keys";

export const useTicketPrices = (params: UsersQuery) =>
  useQuery({
    queryKey: ticketPricesKeys.getAll(params),
    queryFn: () => ticketPricesApi.getAll(params),
    placeholderData: keepPreviousData
  });
