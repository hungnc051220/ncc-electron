import type { PermissionAction, PermissionAssignment } from "@shared/types";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { canAccessRoute, hasPermission } from "@renderer/permissions/utils";

type PermissionState = {
  assignments: PermissionAssignment[];
  setAssignments: (assignments: PermissionAssignment[]) => void;
  clearAssignments: () => void;
  can: (permissionKey: string, action: PermissionAction) => boolean;
  canRoute: (route: string) => boolean;
};

export const usePermissionStore = create<PermissionState>()(
  persist(
    (set, get) => ({
      assignments: [],
      setAssignments: (assignments) => set({ assignments }),
      clearAssignments: () => set({ assignments: [] }),
      can: (permissionKey, action) => hasPermission(get().assignments, permissionKey, action),
      canRoute: (route) => canAccessRoute(get().assignments, route)
    }),
    {
      name: "pos-permissions",
      storage: createJSONStorage(() => sessionStorage)
    }
  )
);
