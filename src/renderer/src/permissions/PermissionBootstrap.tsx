import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Spin } from "antd";
import { useUserDetail } from "@renderer/hooks/users/useUserDetail";
import { useAuthStore } from "@renderer/store/auth.store";
import { usePermissionStore } from "@renderer/store/permission.store";
import { buildMockPermissionAssignments } from "./mockPermissions";

type PermissionBootstrapProps = {
  children: ReactNode;
};

const parseRoleIds = (roleIds?: string | null) =>
  (roleIds ?? "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);

const PermissionBootstrap = ({ children }: PermissionBootstrapProps) => {
  const userId = useAuthStore((state) => state.userId);
  const clearAssignments = usePermissionStore((state) => state.clearAssignments);
  const setAssignments = usePermissionStore((state) => state.setAssignments);
  const [isReady, setIsReady] = useState(!userId);

  const { data: user, isPending } = useUserDetail(userId ?? 0);

  useEffect(() => {
    setIsReady(!userId);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      clearAssignments();
      setIsReady(true);
      return;
    }

    if (isPending) {
      return;
    }

    const roleIds = parseRoleIds(user?.roleIds);

    if (!roleIds.length) {
      setAssignments([]);
      setIsReady(true);
      return;
    }

    setAssignments(buildMockPermissionAssignments(roleIds));
    setIsReady(true);
  }, [clearAssignments, isPending, setAssignments, user?.roleIds, userId]);

  if (!isReady) {
    return <Spin spinning fullscreen />;
  }

  return <>{children}</>;
};

export default PermissionBootstrap;
