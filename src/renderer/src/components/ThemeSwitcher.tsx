import { useThemeStore } from "@renderer/store/theme.store";
import { Button } from "antd";
import { MoonOutlined, SunOutlined } from "@ant-design/icons";

const ThemeSwitcher = () => {
  const { theme, setTheme } = useThemeStore();

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
