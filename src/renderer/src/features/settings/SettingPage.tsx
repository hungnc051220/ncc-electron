import type { MenuProps } from "antd";
import { Breadcrumb, Layout, Menu } from "antd";
import { useState } from "react";
import { Link } from "react-router";
import ChangePassword from "./components/ChangePassword";
import SettingPos from "./components/SettingPos";
import SettingPrinter from "./components/SettingPrinter";
const { Content } = Layout;

type MenuItem = Required<MenuProps>["items"][number];

const items: MenuItem[] = [
  {
    key: "settings",
    label: "Cấu hình",
    type: "group",
    children: [
      { key: "1", label: "Cấu hình tài khoản" },
      { key: "2", label: "Cấu hình máy POS" },
      { key: "3", label: "Cấu hình máy in" }
    ]
  }
];

const SettingPage = () => {
  const [selectedKey, setSelectedKey] = useState<string>("1");

  const onClick: MenuProps["onClick"] = (e) => {
    setSelectedKey(e.key);
  };

  return (
    <div className="space-y-4 flex-1 h-full p-4 pb-0 flex flex-col">
      <Breadcrumb
        items={[
          {
            title: <Link to="/">Trang chủ</Link>
          },
          {
            title: "Hệ thống"
          },
          {
            title: "Cài đặt"
          }
        ]}
      />

      <div className="flex-1">
        <Layout hasSider className="flex-1 h-full">
          <Menu
            selectedKeys={[selectedKey]}
            onClick={onClick}
            style={{ width: 256 }}
            defaultSelectedKeys={["1"]}
            defaultOpenKeys={["settings"]}
            mode="inline"
            items={items}
            className="h-full bg-app-bg"
          />
          <Layout>
            <Content className="bg-app-bg px-6">
              {selectedKey === "1" && <ChangePassword />}
              {selectedKey === "2" && <SettingPos />}
              {selectedKey === "3" && <SettingPrinter />}
            </Content>
          </Layout>
        </Layout>
      </div>
    </div>
  );
};

export default SettingPage;
