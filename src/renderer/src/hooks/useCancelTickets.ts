import { cancelTicketsApi, CancelTicketsQuery } from "@renderer/api/cancelTickets.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

export const useCancelTickets = (params: CancelTicketsQuery) =>
  useQuery({
    queryKey: ["cancel-tickets", params],
    queryFn: () => cancelTicketsApi.getAll(params),
    placeholderData: keepPreviousData
  });
