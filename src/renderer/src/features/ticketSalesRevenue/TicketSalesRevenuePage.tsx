"use client";

import type { TabsProps } from "antd";
import { Breadcrumb, Tabs } from "antd";
import TabRevenueByFilm from "./components/TabRevenueByFilm";
import TabRevenueByStaff from "./components/TabRevenueByStaff";
import { Link } from "react-router";

const items: TabsProps["items"] = [
  {
    key: "1",
    label: "Doanh thu theo nhân viên",
    children: <TabRevenueByStaff />
  },
  {
    key: "2",
    label: "Doanh thu theo phim",
    children: <TabRevenueByFilm />
  }
];

const TicketSalesRevenuePage = () => {
  return (
    <div className="space-y-3 mt-4 px-4">
      <Breadcrumb
        items={[
          {
            title: <Link to="/">Trang chủ</Link>
          },
          {
            title: "Bán vé"
          },
          {
            title: "Thống kê doanh thu bán vé"
          }
        ]}
      />

      <Tabs defaultActiveKey="1" items={items} />
    </div>
  );
};

export default TicketSalesRevenuePage;
