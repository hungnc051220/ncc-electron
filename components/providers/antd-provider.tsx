"use client";
import QueryProvider from "@/providers/query-provider";
import { StyleProvider } from "@ant-design/cssinjs";
import { ConfigProvider } from "antd";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import viVN from "antd/locale/vi_VN";
import "dayjs/locale/vi";
import dayjs from "dayjs";
dayjs.locale("vi");

const AntdProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <AntdRegistry>
      <QueryProvider>
        <StyleProvider layer>
          <ConfigProvider
            locale={viVN}
            theme={{
              token: {
                colorPrimary: "#464FB4",
                fontFamily: "'Inter', sans-serif",
              },
            }}
          >
            {children}
          </ConfigProvider>
        </StyleProvider>
      </QueryProvider>
    </AntdRegistry>
  );
};

export default AntdProvider;
