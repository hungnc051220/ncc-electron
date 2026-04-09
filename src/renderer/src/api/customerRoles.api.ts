import { api } from "@renderer/api/client";
import {
  BulkUpdateRolePermissionsRequest,
  BulkUpdateRolePermissionsResponse,
  CustomerRoleProps,
  GetRolePermissionsRequest,
  GetStaffPermissionsRequest,
  PermissionCatalogResponse,
  RolePermissionResponse,
  StaffPermissionResponse,
  permissionApiEndpoints
} from "@shared/types";

export interface CustomerRoleDto {
  name: string;
  systemName: string;
  active: boolean;
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
  create: async (dto: CustomerRoleDto): Promise<CustomerRoleProps> => {
    const res = await api.post("/api/pos/customer-role", {
      ...dto,
      freeShipping: false,
      taxExempt: false,
      isSystemRole: true
    });
    return res.data;
  },
  update: async (id: number, dto: CustomerRoleDto): Promise<CustomerRoleProps> => {
    const res = await api.patch(`/api/pos/customer-role/${id}`, {
      ...dto,
      freeShipping: false,
      taxExempt: false,
      isSystemRole: true
    });
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/api/pos/customer-role/${id}`);
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
