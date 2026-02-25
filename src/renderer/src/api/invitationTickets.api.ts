import { api } from "@renderer/api/client";
import { BackgroundProps } from "@shared/types";

export interface InvitationTicketDto {
  orderId: number;
  receivedEmail: string;
  status: "new" | "sent" | "failed";
  urlTicket: string;
  title: string;
}

export const invitationTicketsApi = {
  getBackgrounds: async (): Promise<BackgroundProps[]> => {
    const res = await api.get("/api/pos/invitation-ticket-histories/background-images");
    return res.data;
  },
  create: async (dto: InvitationTicketDto) => {
    const res = await api.post("/api/pos/invitation-ticket-histories", dto);
    return res.data;
  }
};
