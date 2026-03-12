import type { PermissionAction } from "@shared/types";
import { useMemo } from "react";
import { usePermissionStore } from "@renderer/store/permission.store";
import { hasPermission } from "./utils";

export const usePermission = () => {
  const assignments = usePermissionStore((state) => state.assignments);

  return useMemo(
    () => ({
      can: (permissionKey: string, action: PermissionAction) =>
        hasPermission(assignments, permissionKey, action)
    }),
    [assignments]
  );
};
