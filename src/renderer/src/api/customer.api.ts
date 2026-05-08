import { api } from "@renderer/api/client";
import { CustomerPosProps } from "@shared/types";

export const customerApi = {
  getDetail: async (cardCode?: string): Promise<CustomerPosProps> => {
    const res = await api.get(`/api/web/v1/pos/web-customers/detail/${cardCode}`);
    return res.data;
  }
};
