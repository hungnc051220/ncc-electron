import { api } from "@renderer/api/client";
import { GeneralDataProps } from "@shared/types";

export const generalDataApi = {
  get: async (): Promise<GeneralDataProps> => {
    const res = await api.get("/api/pos/v1/films/general-data");
    return res.data;
  }
};
