import { invitationTicketsApi } from "@renderer/api/invitationTickets.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { invitationTicketsKeys } from "./keys";

export const useInvitationTicketBackgrounds = () =>
  useQuery({
    queryKey: invitationTicketsKeys.backgrounds(),
    queryFn: () => invitationTicketsApi.getBackgrounds(),
    placeholderData: keepPreviousData
  });
