"use client";

import type { TabsProps } from "antd";
import { Breadcrumb, Tabs } from "antd";
import RevenueByFilm from "./components/revenueByFilm";
// import ExamineTicketByPlan from "./components/examineTicketByPlan";
// import Vouchers from "./components/vouchers";
// import U22Usage from "./components/u22";
// import MonthlyRevenueByTicket from "./components/monthlyRevenueByTicket";
import { Link } from "react-router";
import MonthlyRevenueByTicket from "./components/monthlyRevenueByTicket";
import ExamineTicketByPlan from "./components/examineTicketByPlan";
import U22Usage from "./components/u22";
import Vouchers from "./components/vouchers";

const StaffRevenueReportPage = () => {
  const items: TabsProps["items"] = [
    {
      key: "1",
      label: "Báo cáo doanh thu theo ngày bán",
      children: <RevenueByFilm />
    },
    {
      key: "2",
      label: "Báo cáo doanh thu theo nhân viên",
      children: <RevenueByFilm />
    },
    {
      key: "3",
      label: "Báo cáo tháng của nhân viên",
      children: <MonthlyRevenueByTicket />
    },
    {
      key: "4",
      label: "Báo cáo rà soát vé",
      children: <ExamineTicketByPlan />
    },
    {
      key: "5",
      label: "Báo cáo số lượng Voucher",
      children: <Vouchers />
    },
    {
      key: "6",
      label: "Báo cáo giao dịch mua vé thẻ U22",
      children: <U22Usage />
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
              title: "Báo cáo vé bán, doanh thu theo nhân viên"
            }
          ]}
        />
      </div>

      <Tabs defaultActiveKey="1" items={items} />
    </div>
  );
};

export default StaffRevenueReportPage;
