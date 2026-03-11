export const permissionActions = [
  "access",
  "list",
  "view",
  "create",
  "update",
  "delete",
  "approve",
  "export",
  "print",
  "configure"
] as const;

export type PermissionAction = (typeof permissionActions)[number];

export interface PermissionDefinition {
  key: string;
  module: string;
  label: string;
  route?: string;
  description?: string;
  actions: PermissionAction[];
}

export type PermissionValueMap = Partial<Record<PermissionAction, boolean>>;

export interface PermissionAssignment {
  permissionKey: string;
  actions: PermissionValueMap;
}

export interface PermissionMatrixRow extends PermissionDefinition {
  id: string;
  values: Record<PermissionAction, boolean>;
}

export interface PermissionCatalogResponse {
  version: string;
  permissions: PermissionDefinition[];
}

export interface RolePermissionResponse {
  roleId: number;
  roleName: string;
  permissions: PermissionAssignment[];
  updatedAt?: string;
  updatedBy?: string;
}

export interface StaffPermissionResponse {
  userId: number;
  roleIds: number[];
  permissions: PermissionAssignment[];
}

export interface GetRolePermissionsRequest {
  roleIds: number[];
  includePermissionCatalog?: boolean;
}

export interface GetStaffPermissionsRequest {
  userId: number;
  includePermissionCatalog?: boolean;
}

export interface UpdateRolePermissionsRequest {
  roleId: number;
  permissions: PermissionAssignment[];
}

export interface UpdateRolePermissionsResponse {
  roleId: number;
  updatedAt: string;
  updatedBy: string;
  permissions: PermissionAssignment[];
}

export const permissionApiEndpoints = {
  getCatalog: "/api/pos/permissions/catalog",
  getRolePermissions: "/api/pos/permissions/roles",
  getStaffPermissions: "/api/pos/permissions/staff",
  updateRolePermissions: "/api/pos/permissions/roles/update"
} as const;
