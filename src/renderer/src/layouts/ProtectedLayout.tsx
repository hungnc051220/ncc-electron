import { Outlet, Navigate } from "react-router";
import { useAuthStore } from "../store/auth.store";
import PermissionBootstrap from "@renderer/permissions/PermissionBootstrap";

export default function ProtectedLayout() {
  const isAuth = useAuthStore((s) => s.isAuth);
  const isCustomerMode = window.location.hash.includes("view=customer");

  if (!isAuth && !isCustomerMode) {
    return <Navigate to="/login" replace />;
  }

  return (
    <PermissionBootstrap>
      <Outlet />
    </PermissionBootstrap>
  );
}
