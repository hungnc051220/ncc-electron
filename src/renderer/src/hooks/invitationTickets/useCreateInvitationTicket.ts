import { invitationTicketsApi } from "@renderer/api/invitationTickets.api";
import { useMutation } from "@tanstack/react-query";

export const useCreateInvitationTicket = () => {
  return useMutation({
    mutationFn: invitationTicketsApi.create
  });
};
