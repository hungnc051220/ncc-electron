import { api } from "@renderer/api/client";
import {
  BulkUpdateRolePermissionsRequest,
  BulkUpdateRolePermissionsResponse,
  CustomerRoleMenuProps,
  CustomerRoleProps,
  GetRolePermissionsRequest,
  GetStaffPermissionsRequest,
  PermissionCatalogResponse,
  RolePermissionResponse,
  StaffPermissionResponse,
  permissionApiEndpoints
} from "@shared/types";

export interface CustomerRoleMenuDto {
  customerIds?: number[];
  roleIds?: number[];
  groupByRole?: boolean;
}

export type CustomerRoleMenuResponse = CustomerRoleMenuProps[] | CustomerRoleMenuProps[][];

export const customerRolesApi = {
  getAll: async (): Promise<CustomerRoleProps[]> => {
    const res = await api.get("/api/pos/customer-role");
    return res.data;
  },
  getDetail: async (id: number): Promise<CustomerRoleProps> => {
    const res = await api.get(`/api/pos/customer-role/${id}`);
    return res.data;
  },
  getMenu: async (dto?: CustomerRoleMenuDto): Promise<CustomerRoleMenuResponse> => {
    const res = await api.post("/api/pos/customer-role/menu", dto);
    return res.data;
  },
  updateMenu: async (dto: CustomerRoleMenuProps[]): Promise<CustomerRoleProps[]> => {
    const res = await api.post("/api/pos/customer-role/menu/update", {
      actingGroups: dto,
      groupByRole: true
    });
    return res.data;
  },
  getPermissionCatalog: async (): Promise<PermissionCatalogResponse> => {
    const res = await api.get(permissionApiEndpoints.getCatalog);
    return res.data;
  },
  getRolePermissions: async (dto: GetRolePermissionsRequest): Promise<RolePermissionResponse[]> => {
    const res = await api.post(permissionApiEndpoints.getRolePermissions, dto);
    return res.data;
  },
  getStaffPermissions: async (
    dto: GetStaffPermissionsRequest
  ): Promise<StaffPermissionResponse> => {
    const res = await api.post(permissionApiEndpoints.getStaffPermissions, dto);
    return res.data;
  },
  updateRolePermissions: async (
    dto: BulkUpdateRolePermissionsRequest
  ): Promise<BulkUpdateRolePermissionsResponse> => {
    const res = await api.post(permissionApiEndpoints.updateRolePermissions, dto);
    return res.data;
  }
};
