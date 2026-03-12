import type { ReactNode } from "react";
import { useEffect } from "react";
import { Spin } from "antd";
import { useAuthStore } from "@renderer/store/auth.store";
import { usePermissionStore } from "@renderer/store/permission.store";
import { useStaffPermissions } from "@renderer/hooks/permissions/useStaffPermissions";

type PermissionBootstrapProps = {
  children: ReactNode;
};

const PermissionBootstrap = ({ children }: PermissionBootstrapProps) => {
  const userId = useAuthStore((state) => state.userId);
  const clearAssignments = usePermissionStore((state) => state.clearAssignments);
  const setAssignments = usePermissionStore((state) => state.setAssignments);

  const { data: staffPermissions, isFetching: isFetchingPermissions } = useStaffPermissions(
    userId ? { userId } : undefined
  );

  useEffect(() => {
    if (!userId) {
      clearAssignments();
    }
  }, [clearAssignments, userId]);

  useEffect(() => {
    if (!userId) {
      setAssignments([]);
      return;
    }

    setAssignments(staffPermissions?.permissions ?? []);
  }, [setAssignments, staffPermissions?.permissions, userId]);

  if (userId && isFetchingPermissions) {
    return <Spin spinning fullscreen />;
  }

  return <>{children}</>;
};

export default PermissionBootstrap;
