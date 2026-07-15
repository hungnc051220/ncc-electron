import { UserOutlined } from "@ant-design/icons";
import { useAuthStore } from "@renderer/store/auth.store";
import type { MenuProps } from "antd";
import { Avatar, Dropdown } from "antd";
import { Link } from "react-router";
import ThemeSwitcher from "./ThemeSwitcher";
import { disconnectSocket } from "@renderer/socket/socket";
import QuitApp from "./QuitApp";

const NavActions = () => {
  const logout = useAuthStore((s) => s.logout);

  const items: MenuProps["items"] = [
    {
      key: "1",
      label: <Link to="settings">Cài đặt chung</Link>
    },
    {
      key: "2",
      danger: true,
      label: "Đăng xuất",
      onClick: () => {
        logout();
        disconnectSocket();
      }
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
      <div className="mx-1 h-6 w-px bg-slate-200 dark:bg-white/12" aria-hidden />
      <QuitApp className="h-8 w-8 rounded-lg bg-rose-50! p-0! text-rose-600! hover:bg-rose-100! hover:text-rose-700! dark:bg-rose-500/12! dark:text-rose-300! dark:hover:bg-rose-500/22! dark:hover:text-rose-200!" />
    </div>
  );
};

export default NavActions;
