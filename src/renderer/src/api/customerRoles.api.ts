import { api } from "@renderer/api/client";
import { CustomerRoleMenuProps, CustomerRoleProps } from "@shared/types";

export interface CustomerRoleMenuDto {
  customerIds?: number[];
  roleIds?: number[];
  groupByRole?: boolean;
}

export const customerRolesApi = {
  getAll: async (): Promise<CustomerRoleProps[]> => {
    const res = await api.get("/api/pos/customer-role");
    return res.data;
  },
  getDetail: async (id: number): Promise<CustomerRoleProps> => {
    const res = await api.get(`/api/pos/customer-role/${id}`);
    return res.data;
  },
  getMenu: async (dto?: CustomerRoleMenuDto): Promise<CustomerRoleMenuProps[]> => {
    const res = await api.post("/api/pos/customer-role/menu", dto);
    return res.data;
  },
  updateMenu: async (dto: CustomerRoleMenuProps[]): Promise<CustomerRoleProps[]> => {
    const res = await api.post("/api/pos/customer-role/menu/update", {
      actingGroups: dto,
      groupByRole: true
    });
    return res.data;
  }
};
