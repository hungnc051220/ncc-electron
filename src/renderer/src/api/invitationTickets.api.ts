import { api } from "@renderer/api/client";
import { BackgroundProps } from "@renderer/types";

export const invitationTicketsApi = {
  getBackgrounds: async (): Promise<BackgroundProps[]> => {
    const res = await api.get("/api/pos/invitation-ticket-histories/background-images");
    return res.data;
  }
};
