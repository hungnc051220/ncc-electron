import { UserOutlined } from "@ant-design/icons";
import { useAuthStore } from "@renderer/store/auth.store";
import type { MenuProps } from "antd";
import { Avatar, Dropdown } from "antd";
import { Link } from "react-router";
import ThemeSwitcher from "./ThemeSwitcher";

const NavActions = () => {
  const logout = useAuthStore((s) => s.logout);

  const items: MenuProps["items"] = [
    {
      key: "1",
      label: <Link to="settings">Cài dặt chung</Link>
    },
    {
      key: "2",
      danger: true,
      label: "Đăng xuất",
      onClick: logout
    }
  ];

  return (
    <div className="flex items-center gap-2">
      <ThemeSwitcher />
      <Dropdown menu={{ items }} trigger={["click"]}>
        <a onClick={(e) => e.preventDefault()}>
          <Avatar size={32} icon={<UserOutlined />} />
        </a>
      </Dropdown>
    </div>
  );
};

export default NavActions;
