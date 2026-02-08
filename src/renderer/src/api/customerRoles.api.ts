import { api } from "@renderer/api/client";
import { CustomerRoleProps } from "@renderer/types";

export const customerRolesApi = {
  getAll: async (): Promise<CustomerRoleProps[]> => {
    const res = await api.get("/api/pos/customer-role");
    return res.data;
  }
};
