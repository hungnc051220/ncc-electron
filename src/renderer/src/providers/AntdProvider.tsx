import { StyleProvider } from "@ant-design/cssinjs";
import { ConfigProvider, theme as antdTheme } from "antd";
import viVN from "antd/locale/vi_VN";
import "dayjs/locale/vi";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import quarterOfYear from "dayjs/plugin/quarterOfYear";
import { useThemeStore } from "@renderer/store/theme.store";
import { ThemeSync } from "@renderer/components/ThemeSync";

dayjs.locale("vi");
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(quarterOfYear);
dayjs.tz.setDefault("Asia/Ho_Chi_Minh");

const AntdProvider = ({ children }: { children: React.ReactNode }) => {
  const { theme } = useThemeStore();

  const isDark = theme === "dark";

  return (
    <StyleProvider layer>
      <ConfigProvider
        locale={viVN}
        theme={{
          token: {
            colorPrimary: "#464FB4",
            fontFamily: "Inter, system-ui, sans-serif",
            ...(!isDark && {
              colorBgLayout: "#FFFFFF"
            }),
            ...(isDark && {
              colorBgContainer: "#141414"
            })
          },
          algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm
        }}
      >
        <ThemeSync />
        {children}
      </ConfigProvider>
    </StyleProvider>
  );
};

export default AntdProvider;
