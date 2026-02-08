import NavItems from "@renderer/components/NavItems";
import { Layout } from "antd";
import React from "react";
import { Link, Outlet } from "react-router";
import logo from "../assets/images/logo-text.png";

const { Content } = Layout;

const DashboardLayout: React.FC = () => {
  return (
    <Layout className="h-screen">
      <header className="flex items-center gap-10 bg-white h-12 sticky top-0 z-50 w-full px-4 shadow-sm">
        <Link to="/">
          <img src={logo} alt="logo" className="h-9 w-auto object-contain" />
        </Link>
        <NavItems />
      </header>
      <Content className="flex-1 overflow-y-auto bg-white">
        <Outlet />
      </Content>
      <footer className="mt-auto py-4 px-4 lg:px-8 border-t border-gray-200 bg-white">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-gray-500">
          <p>Sản phẩm được phát triển bởi AN VUI JSC</p>
          <a href="#" className="hover:text-blue-600 transition-colors">
            Điều khoản và Chính sách
          </a>
        </div>
      </footer>
    </Layout>
  );
};

export default DashboardLayout;
