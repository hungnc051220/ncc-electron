import type { PermissionAction, PermissionAssignment } from "@shared/types";
import { PERMISSION_CATALOG } from "./definitions";

type MockPermissionConfig = Partial<Record<string, PermissionAction[]>>;

const ALL_ACTIONS_BY_PERMISSION = Object.fromEntries(
  PERMISSION_CATALOG.map((permission) => [permission.key, permission.actions])
) as Record<string, PermissionAction[]>;

const MOCK_ROLE_PERMISSIONS: Record<number, MockPermissionConfig> = {
  1: Object.fromEntries(
    PERMISSION_CATALOG.map((permission) => [permission.key, permission.actions])
  ),
  3: {
    dashboard: ["access", "view"],
    showtimes: ["access", "list", "view", "create", "print"],
    print_online_tickets: ["access", "list", "view", "print"],
    find_online_tickets: ["access", "list", "view"],
    cancellation_tickets: ["access", "list", "view"],
    refunds: ["access", "list", "view"],
    invitation_tickets: ["access", "list", "view", "print"]
  }
};

export const buildMockPermissionAssignments = (roleIds: number[]): PermissionAssignment[] => {
  const mergedAllowedActions = new Map<string, Set<PermissionAction>>();

  roleIds.forEach((roleId) => {
    const config = MOCK_ROLE_PERMISSIONS[roleId];

    if (!config) {
      return;
    }

    Object.entries(config).forEach(([permissionKey, actions]) => {
      const current = mergedAllowedActions.get(permissionKey) ?? new Set<PermissionAction>();
      actions?.forEach((action) => current.add(action));
      mergedAllowedActions.set(permissionKey, current);
    });
  });

  return PERMISSION_CATALOG.map((permission) => {
    const allowedActions = mergedAllowedActions.get(permission.key) ?? new Set<PermissionAction>();
    const actions = permission.actions.reduce(
      (acc, action) => {
        acc[action] = allowedActions.has(action);
        return acc;
      },
      {} as Record<PermissionAction, boolean>
    );

    if (
      actions.access &&
      !actions.view &&
      ALL_ACTIONS_BY_PERMISSION[permission.key].includes("view")
    ) {
      actions.view = true;
    }

    return {
      permissionKey: permission.key,
      actions
    };
  });
};
