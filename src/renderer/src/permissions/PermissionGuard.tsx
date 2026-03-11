import type { ReactNode } from "react";
import type { PermissionAction } from "@shared/types";
import { Navigate } from "react-router";
import { usePermissionStore } from "@renderer/store/permission.store";

type PermissionGuardProps = {
  permissionKey: string;
  action?: PermissionAction;
  fallbackPath?: string;
  children: ReactNode;
};

const PermissionGuard = ({
  permissionKey,
  action = "access",
  fallbackPath = "/",
  children
}: PermissionGuardProps) => {
  const can = usePermissionStore((state) => state.can(permissionKey, action));

  if (!can) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};

export default PermissionGuard;
