import { TicketPriceByPlanDto, ticketPricesApi } from "@renderer/api/ticketPrices.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ticketPricesKeys } from "./keys";

export const useTicketPricesByPlan = (dto: TicketPriceByPlanDto) =>
  useQuery({
    queryKey: ticketPricesKeys.getByPlan(dto),
    queryFn: () => ticketPricesApi.getByPlan(dto),
    placeholderData: keepPreviousData,
    enabled: !!dto.date && !!dto.roomId && !!dto.versionCode
  });
