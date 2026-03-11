import type {
  CustomerRoleMenuProps,
  PermissionAction,
  PermissionAssignment,
  PermissionDefinition,
  PermissionMatrixRow
} from "@shared/types";
import { permissionActions } from "@shared/types";
import { PERMISSION_CATALOG } from "./definitions";

const createEmptyValues = (): Record<PermissionAction, boolean> =>
  permissionActions.reduce(
    (acc, action) => {
      acc[action] = false;
      return acc;
    },
    {} as Record<PermissionAction, boolean>
  );

export const buildPermissionMatrix = (
  assignments?: PermissionAssignment[],
  definitions: PermissionDefinition[] = PERMISSION_CATALOG
): PermissionMatrixRow[] => {
  const assignmentMap = new Map(assignments?.map((item) => [item.permissionKey, item.actions]) ?? []);

  return definitions.map((definition) => {
    const values = createEmptyValues();
    const assignedActions = assignmentMap.get(definition.key);

    definition.actions.forEach((action) => {
      values[action] = assignedActions?.[action] ?? false;
    });

    return {
      ...definition,
      id: definition.key,
      values
    };
  });
};

export const mergePermissionAssignments = (
  assignmentsGroups: PermissionAssignment[][]
): PermissionAssignment[] => {
  const merged = new Map<string, Record<PermissionAction, boolean>>();

  assignmentsGroups.flat().forEach((assignment) => {
    const current = merged.get(assignment.permissionKey) ?? createEmptyValues();

    permissionActions.forEach((action) => {
      current[action] = current[action] || (assignment.actions[action] ?? false);
    });

    merged.set(assignment.permissionKey, current);
  });

  return Array.from(merged.entries()).map(([permissionKey, actions]) => ({
    permissionKey,
    actions
  }));
};

export const legacyMenusToAssignments = (
  legacyMenus?: CustomerRoleMenuProps[]
): PermissionAssignment[] => {
  if (!legacyMenus?.length) {
    return [];
  }

  return PERMISSION_CATALOG.flatMap((definition) => {
    const legacy = legacyMenus.find(
      (item) =>
        item.menu === definition.key ||
        item.menu === definition.route ||
        item.menuName === definition.label
    );

    if (!legacy) {
      return [];
    }

    return [{
      permissionKey: definition.key,
      actions: {
        access: legacy.readOnly || legacy.edit,
        list: legacy.readOnly,
        view: legacy.readOnly,
        create: legacy.edit,
        update: legacy.edit,
        delete: legacy.edit,
        configure: legacy.edit
      }
    }];
  });
};

export const permissionMatrixToLegacyMenus = (
  roleId: number,
  rows: PermissionMatrixRow[],
  legacyMenus?: CustomerRoleMenuProps[]
): CustomerRoleMenuProps[] => {
  return rows.map((row, index) => {
    const legacy = legacyMenus?.find(
      (item) => item.menu === row.key || item.menu === row.route || item.menuName === row.label
    );

    return {
      id: legacy?.id ?? index + 1,
      customerRoleId: legacy?.customerRoleId ?? roleId,
      menu: row.key,
      menuName: row.label,
      readOnly: row.values.access || row.values.list || row.values.view,
      edit:
        row.values.create ||
        row.values.update ||
        row.values.delete ||
        row.values.approve ||
        row.values.export ||
        row.values.print ||
        row.values.configure
    };
  });
};

export const hasPermission = (
  assignments: PermissionAssignment[] | undefined,
  permissionKey: string,
  action: PermissionAction
): boolean => {
  if (!assignments?.length) {
    return true;
  }

  const permission = assignments?.find((item) => item.permissionKey === permissionKey);

  if (!permission) {
    return true;
  }

  return permission.actions[action] ?? true;
};

export const canAccessRoute = (
  assignments: PermissionAssignment[] | undefined,
  route: string
): boolean => {
  if (!assignments?.length) {
    return true;
  }

  const permission = PERMISSION_CATALOG.find((item) => item.route === route);

  if (!permission) {
    return true;
  }

  return hasPermission(assignments, permission.key, "access");
};
