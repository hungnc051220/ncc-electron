import type { ReactNode } from "react";
import { useEffect } from "react";
import { Spin } from "antd";
import { useCustomerRoleMenu } from "@renderer/hooks/customerRoles/useCustomerRoleMenu";
import { useUserDetail } from "@renderer/hooks/users/useUserDetail";
import { legacyMenusToAssignments, mergePermissionAssignments } from "./utils";
import { useAuthStore } from "@renderer/store/auth.store";
import { usePermissionStore } from "@renderer/store/permission.store";
import { CustomerRoleMenuProps } from "@shared/types";

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

  const { data: user, isFetching: isFetchingUser } = useUserDetail(userId ?? 0);
  const roleIds = parseRoleIds(user?.roleIds);

  const { data: roleMenus, isFetching: isFetchingMenus } = useCustomerRoleMenu(
    roleIds.length ? { roleIds, groupByRole: true } : undefined
  );

  useEffect(() => {
    if (!userId) {
      clearAssignments();
    }
  }, [clearAssignments, userId]);

  useEffect(() => {
    if (!roleIds.length) {
      setAssignments([]);
      return;
    }

    const menuGroups = Array.isArray(roleMenus?.[0])
      ? (roleMenus as CustomerRoleMenuProps[][])
      : [((roleMenus ?? []) as CustomerRoleMenuProps[])];
    const mergedAssignments = mergePermissionAssignments(
      menuGroups.map((group) => legacyMenusToAssignments(group))
    );
    setAssignments(mergedAssignments);
  }, [roleIds.length, roleMenus, setAssignments]);

  if (userId && (isFetchingUser || (roleIds.length > 0 && isFetchingMenus))) {
    return <Spin spinning fullscreen />;
  }

  return <>{children}</>;
};

export default PermissionBootstrap;
