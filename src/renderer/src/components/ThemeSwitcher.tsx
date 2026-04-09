import { usePermission } from "@renderer/permissions/usePermission";
import { useThemeStore } from "@renderer/store/theme.store";
import { Button } from "antd";
import { MoonOutlined, SunOutlined } from "@ant-design/icons";

const ThemeSwitcher = () => {
  const { can } = usePermission();
  const { theme, setTheme } = useThemeStore();
  const canAccessThemeSwitcher = can("settings_interface", "access");

  if (!canAccessThemeSwitcher) {
    return null;
  }

  const onClick = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.api.sendThemeUpdate(next);
  };

  return (
    <div onClick={onClick}>
      <Button icon={theme === "dark" ? <SunOutlined /> : <MoonOutlined />} />
    </div>
  );
};

export default ThemeSwitcher;
