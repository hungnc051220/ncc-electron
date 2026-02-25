import { theme } from "antd";
import { useEffect } from "react";

export function ThemeSync() {
  const { token } = theme.useToken();

  useEffect(() => {
    const root = document.documentElement;

    root.style.setProperty("--app-bg", token.colorBgLayout);
    root.style.setProperty("--app-bg-container", token.colorBgContainer);
    root.style.setProperty("--app-text", token.colorText);
    root.style.setProperty("--app-border", token.colorBorder);
    root.style.setProperty("--app-primary", token.colorPrimary);
  }, [token]);

  return null;
}
