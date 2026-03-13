import type { ReactNode } from "react";
import { useEffect } from "react";
import { useStaffPermissions } from "@renderer/hooks/permissions/useStaffPermissions";
import { useAuthStore } from "@renderer/store/auth.store";
import { usePermissionStore } from "@renderer/store/permission.store";

type PermissionBootstrapProps = {
  children: ReactNode;
};

const PermissionBootstrap = ({ children }: PermissionBootstrapProps) => {
  const userId = useAuthStore((state) => state.userId);
  const clearAssignments = usePermissionStore((state) => state.clearAssignments);
  const setAssignments = usePermissionStore((state) => state.setAssignments);

  const { data: staffPermissions } = useStaffPermissions(userId ? { userId } : undefined);

  useEffect(() => {
    if (!userId) {
      clearAssignments();
      return;
    }

    if (staffPermissions?.permissions) {
      setAssignments(staffPermissions.permissions);
    }
  }, [clearAssignments, setAssignments, staffPermissions?.permissions, userId]);

  return <>{children}</>;
};

export default PermissionBootstrap;
