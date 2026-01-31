"use client";

import type { TabsProps } from "antd";
import { Breadcrumb, Tabs } from "antd";
import RevenueByFilm from "./tabs/revenue-by-film";
import ExamineTicketByPlan from "./tabs/examine-ticket-by-plan";
import Vouchers from "./tabs/vouchers";
import U22Usage from "./tabs/u22";
import MonthlyRevenueByTicket from "./tabs/monthly-revenue-by-ticket";

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
      children: <MonthlyRevenueByTicket />,
    },
    {
      key: "4",
      label: "Báo cáo rà soát vé",
      children: <ExamineTicketByPlan />,
    },
    {
      key: "5",
      label: "Báo cáo số lượng Voucher",
      children: <Vouchers />,
    },
    {
      key: "6",
      label: "Báo cáo giao dịch mua vé thẻ U22",
      children: <U22Usage />,
    },
    // {
    //   key: "7",
    //   label: "Báo cáo giao dịch mua vé thẻ thành viên",
    //   children: "Content of Tab Pane 1",
    // },
    // {
    //   key: "8",
    //   label: "Báo cáo chương trình chăm sóc khách hàng",
    //   children: "Content of Tab Pane 2",
    // },
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
