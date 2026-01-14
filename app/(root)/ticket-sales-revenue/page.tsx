"use client";

import type { TabsProps } from "antd";
import { Breadcrumb, Tabs } from "antd";
import TabRevenueByFilm from "./components/tab-revenue-by-film";
import TabRevenueByStaff from "./components/tab-revenue-by-staff";

const items: TabsProps["items"] = [
  {
    key: "1",
    label: "Doanh thu theo nhân viên",
    children: <TabRevenueByStaff />,
  },
  {
    key: "2",
    label: "Doanh thu theo phim",
    children: <TabRevenueByFilm />,
  },
];

const AccessHistoryPage = () => {
  return (
    <div className="space-y-3 mt-4 px-4">
      <Breadcrumb
        items={[
          {
            title: "Trang chủ",
          },
          {
            title: "Bán vé",
          },
          {
            title: "Thống kê doanh thu bán vé",
          },
        ]}
      />

      <Tabs defaultActiveKey="1" items={items} />
    </div>
  );
};

export default AccessHistoryPage;
