"use client";

import type { TabsProps } from "antd";
import { Breadcrumb, Tabs } from "antd";
import RevenueByFilm from "./tabs/revenue-by-film";

const StaffRevenueReportClient = () => {
  const items: TabsProps["items"] = [
    {
      key: "1",
      label: "Báo cáo doanh thu theo ngày bán",
      children: <RevenueByFilm />,
    },
    {
      key: "2",
      label: "Báo cáo doanh thu theo nhân viên",
      children: <RevenueByFilm />,
    },
    {
      key: "3",
      label: "Báo cáo tháng của nhân viên",
      children: "Content of Tab Pane 3",
    },
    {
      key: "4",
      label: "Báo cáo rà soát vé",
      children: "Content of Tab Pane 1",
    },
    {
      key: "5",
      label: "Báo cáo số lượng Voucher",
      children: "Content of Tab Pane 2",
    },
    {
      key: "6",
      label: "Báo cáo giao dịch mua vé thẻ U22",
      children: "Content of Tab Pane 3",
    },
    {
      key: "7",
      label: "Báo cáo giao dịch mua vé thẻ thành viên",
      children: "Content of Tab Pane 1",
    },
    {
      key: "8",
      label: "Báo cáo chương trình chăm sóc khách hàng",
      children: "Content of Tab Pane 2",
    },
  ];

  return (
    <div className="space-y-3 mt-4 px-4">
      <div className="flex items-center justify-between">
        <Breadcrumb
          items={[
            {
              title: "Trang chủ",
              href: "/",
            },
            {
              title: "Thống kê, báo cáo",
            },
            {
              title: "Báo cáo vé bán, doanh thu theo nhân viên",
            },
          ]}
        />
      </div>

      <Tabs defaultActiveKey="1" items={items} />
    </div>
  );
};

export default StaffRevenueReportClient;
