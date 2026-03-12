import type { ReactNode } from "react";
import type { PermissionAction } from "@shared/types";
import { Navigate } from "react-router";
import { useLocation } from "react-router";
import { usePermission } from "./usePermission";

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
  const { can } = usePermission();
  const location = useLocation();
  const allowed = can(permissionKey, action);

  if (!allowed) {
    return (
      <Navigate to={fallbackPath} replace state={{ from: location.pathname + location.search }} />
    );
  }

  return <>{children}</>;
};

export default PermissionGuard;
