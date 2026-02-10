"use client";

import type { TabsProps } from "antd";
import { Breadcrumb, Tabs } from "antd";
import Tab1 from "./components/tab1";
import Tab2 from "./components/tab2";
import Tab3 from "./components/tab3";
import { Link } from "react-router";

const MonthlyReportPage = () => {
  const items: TabsProps["items"] = [
    {
      key: "1",
      label: "Thông kê buổi chiếu phim",
      children: <Tab1 />
    },
    {
      key: "2",
      label: "Thống kê doanh thu theo từng loại vé",
      children: <Tab2 />
    },
    {
      key: "3",
      label: "Thống kê doanh thu, khán giả theo phòng chiếu",
      children: <Tab3 />
    }
  ];

  return (
    <div className="space-y-3 mt-4 px-4">
      <div className="flex items-center justify-between">
        <Breadcrumb
          items={[
            {
              title: <Link to="/">Trang chủ</Link>
            },
            {
              title: "Thống kê, báo cáo"
            },
            {
              title: "Báo cáo tháng"
            }
          ]}
        />
      </div>

      <Tabs defaultActiveKey="1" items={items} />
    </div>
  );
};

export default MonthlyReportPage;
