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
      <header className="sticky top-0 z-50 flex h-12 w-full items-center gap-10 border-b border-transparent bg-white/80 px-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/58 dark:shadow-[0_14px_40px_-28px_rgba(0,0,0,0.9)]">
        <Link to="/">
          <img src={logo} alt="logo" className="h-8 w-auto object-contain" />
        </Link>
        <NavItems />
        <NavActions />
      </header>
      <Content className="flex-1 overflow-y-auto bg-app-bg">
        <Outlet />
      </Content>
      <footer className="mt-auto border-t border-slate-200/80 bg-white/80 px-4 py-4 backdrop-blur-xl dark:border-white/12 dark:bg-slate-950/60 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-300/75 sm:flex-row">
          <p>Sản phẩm được phát triển bởi AN VUI JSC. {version && `Phiên bản ${version}`}</p>
        </div>
      </footer>
    </Layout>
  );
};

export default DashboardLayout;
