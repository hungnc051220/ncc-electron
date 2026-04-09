import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import PageHeader from "@renderer/components/PageHeader";
import { usePermission } from "@renderer/permissions/usePermission";
import type { ReactNode } from "react";
import type { MenuProps } from "antd";
import { Layout, Menu } from "antd";
import { useEffect, useMemo, useState } from "react";
import ChangePassword from "./components/ChangePassword";
import SettingEndpoint from "./components/SettingEndpoint";
import SettingPos from "./components/SettingPos";

const { Content } = Layout;

type MenuItem = Required<MenuProps>["items"][number];

type SettingsSection = {
  key: string;
  label: string;
  content: ReactNode;
  permissionKey?: string;
};

const SettingPage = () => {
  const { can } = usePermission();
  const [selectedKey, setSelectedKey] = useState<string>("change-password");

  const sections = useMemo<SettingsSection[]>(
    () => [
      {
        key: "change-password",
        label: "Cấu hình tài khoản",
        content: <ChangePassword />
      },
      {
        key: "settings-pos",
        label: "Cấu hình máy POS",
        permissionKey: "settings_pos",
        content: <SettingPos />
      },
      {
        key: "settings-endpoint",
        label: "Cấu hình Endpoint",
        permissionKey: "settings_endpoint",
        content: <SettingEndpoint />
      }
    ],
    []
  );

  const visibleSections = useMemo(
    () =>
      sections.filter((section) =>
        section.permissionKey ? can(section.permissionKey, "access") : true
      ),
    [can, sections]
  );

  useEffect(() => {
    if (!visibleSections.some((section) => section.key === selectedKey)) {
      setSelectedKey(visibleSections[0]?.key ?? "change-password");
    }
  }, [selectedKey, visibleSections]);

  const items: MenuItem[] = visibleSections.map((section) => ({
    key: section.key,
    label: section.label
  }));

  const activeSection = visibleSections.find((section) => section.key === selectedKey);

  const onClick: MenuProps["onClick"] = (e) => {
    setSelectedKey(e.key);
  };

  return (
    <div className="space-y-4 flex-1 h-full p-4 pb-0 flex flex-col">
      <PageHeader left={<AppBreadcrumb />} />

      <div className="flex-1">
        <Layout hasSider className="flex-1 h-full">
          <Menu
            selectedKeys={[selectedKey]}
            onClick={onClick}
            style={{ width: 256 }}
            defaultOpenKeys={["settings"]}
            mode="inline"
            items={items}
            className="h-full bg-app-bg"
          />
          <Layout>
            <Content className="bg-app-bg px-6">{activeSection?.content}</Content>
          </Layout>
        </Layout>
      </div>
    </div>
  );
};

export default SettingPage;
