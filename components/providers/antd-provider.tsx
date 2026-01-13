"use client";
import QueryProvider from "@/providers/query-provider";
import { StyleProvider } from "@ant-design/cssinjs";
import { ConfigProvider } from "antd";
import { AntdRegistry } from "@ant-design/nextjs-registry";

const AntdProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <AntdRegistry>
      <QueryProvider>
        <StyleProvider layer>
          <ConfigProvider
            theme={{
              token: {
                colorPrimary: "#464FB4",
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
