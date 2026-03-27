import type { ReactNode } from "react";
import type { PermissionAction } from "@shared/types";
import { Navigate } from "react-router";
import { useLocation } from "react-router";
import { usePermission } from "./usePermission";

type PermissionGuardProps = {
  permissionKey: string;
  action?: PermissionAction;
  alternatePermissions?: Array<{
    permissionKey: string;
    action?: PermissionAction;
  }>;
  fallbackPath?: string;
  allowInCustomerMode?: boolean;
  children: ReactNode;
};

const PermissionGuard = ({
  permissionKey,
  action = "access",
  alternatePermissions = [],
  fallbackPath = "/",
  allowInCustomerMode = false,
  children
}: PermissionGuardProps) => {
  const { can } = usePermission();
  const location = useLocation();
  const isCustomerMode = window.location.hash.includes("view=customer");
  const allowed =
    can(permissionKey, action) ||
    alternatePermissions.some((permission) =>
      can(permission.permissionKey, permission.action ?? "access")
    );

  if (!allowed && !(allowInCustomerMode && isCustomerMode)) {
    return (
      <Navigate to={fallbackPath} replace state={{ from: location.pathname + location.search }} />
    );
  }

  return <>{children}</>;
};

export default PermissionGuard;
