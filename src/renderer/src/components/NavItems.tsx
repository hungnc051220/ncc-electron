import { Link, matchPath, useLocation } from "react-router";
import type { MenuProps } from "antd";
import { Menu } from "antd";
import { useUpdater } from "./UpdaterContext";
import { usePermission } from "@renderer/permissions/usePermission";
import { navConfig, type NavConfigItem } from "./navConfig";

type MenuItem = Required<MenuProps>["items"][number];

const NavItems = () => {
  const { showVersionInfo } = useUpdater();
  const { can } = usePermission();
  const { pathname } = useLocation();

  const resolveOnClick = (item: NavConfigItem) => {
    if (item.onClickKey === "showVersionInfo") {
      return showVersionInfo;
    }

    return undefined;
  };

  const toMenuItems = (items: NavConfigItem[]): MenuItem[] =>
    items
      .map((item) => {
        if (item.hiddenInMenu) {
          return null;
        }

        if (item.permissionKey && !can(item.permissionKey, "access")) {
          return null;
        }

        const children = item.children ? toMenuItems(item.children) : undefined;
        if (item.children && !children?.length) {
          return null;
        }

        return {
          label: item.to ? <Link to={item.to}>{item.label}</Link> : item.label,
          key: item.key,
          onClick: resolveOnClick(item),
          children
        } as MenuItem;
      })
      .filter(Boolean) as MenuItem[];

  const items = toMenuItems(navConfig);
  const findActiveKey = (configs: NavConfigItem[]): string => {
    for (const item of configs) {
      const candidates = item.matchPaths ?? (item.to ? [item.to.split("?")[0]] : []);
      if (candidates.some((candidate) => matchPath({ path: candidate, end: true }, pathname))) {
        return item.key;
      }
      if (item.children?.length) {
        const childKey = findActiveKey(item.children);
        if (childKey) {
          return childKey;
        }
      }
    }

    return "";
  };

  const current = findActiveKey(navConfig);

  return (
    <Menu
      selectedKeys={[current]}
      mode="horizontal"
      items={items}
      triggerSubMenuAction="click"
      style={{
        minWidth: 0,
        flex: "auto",
        justifyContent: "center",
        border: "none",
        height: "100%"
      }}
    />
  );
};

export default NavItems;
