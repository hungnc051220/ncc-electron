import NavItems from "@renderer/components/NavItems";
import { Layout } from "antd";
import React, { useEffect, useState } from "react";
import { Link, Outlet } from "react-router";
import logo from "../assets/images/logo-text.png";
import NavActions from "@renderer/components/NavActions";

const { Content } = Layout;

const DashboardLayout: React.FC = () => {
  const [version, setVersion] = useState("");

  useEffect(() => {
    window.api?.getVersion().then(setVersion);
  }, []);

  return (
    <Layout className="h-screen">
      <header className="flex items-center gap-10 h-12 sticky top-0 z-50 w-full px-4 shadow-sm bg-app-bg-container">
        <Link to="/">
          <img src={logo} alt="logo" className="h-8 w-auto object-contain" />
        </Link>
        <NavItems />
        <NavActions />
      </header>
      <Content className="flex-1 overflow-y-auto bg-app-bg">
        <Outlet />
      </Content>
      <footer className="mt-auto py-4 px-4 lg:px-8 border-t border-app-border bg-app-bg">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-gray-500">
          <p>Sản phẩm được phát triển bởi AN VUI JSC. {version && `Phiên bản ${version}`}</p>
          <a href="#" className="hover:text-blue-600 transition-colors">
            Điều khoản và Chính sách
          </a>
        </div>
      </footer>
    </Layout>
  );
};

export default DashboardLayout;
