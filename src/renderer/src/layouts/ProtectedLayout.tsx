import { Outlet, Navigate } from "react-router";
import { useAuthStore } from "../store/auth.store";

export default function ProtectedLayout() {
  const isAuth = useAuthStore((s) => s.isAuth);

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
