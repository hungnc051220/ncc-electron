import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import PageHeader from "@renderer/components/PageHeader";
import type { TabsProps } from "antd";
import { Tabs } from "antd";
import RevenueByFilm from "./components/revenueByFilm";
import MonthlyRevenueByTicket from "./components/monthlyRevenueByTicket";
import ExamineTicketByPlan from "./components/examineTicketByPlan";
import U22Usage from "./components/u22";
import Vouchers from "./components/vouchers";

const StaffRevenueReportPage = () => {
  const items: TabsProps["items"] = [
    {
      key: "1",
      label: "Báo cáo doanh thu theo ngày bán",
      forceRender: true,
      children: (
        <div className="flex h-full min-h-0 flex-col">
          <RevenueByFilm dateType={2} />
        </div>
      )
    },
    {
      key: "2",
      label: "Báo cáo doanh thu theo lịch chiếu",
      forceRender: true,
      children: (
        <div className="flex h-full min-h-0 flex-col">
          <RevenueByFilm dateType={1} />
        </div>
      )
    },
    {
      key: "3",
      label: "Báo cáo tháng của nhân viên",
      forceRender: true,
      children: (
        <div className="flex h-full min-h-0 flex-col">
          <MonthlyRevenueByTicket />
        </div>
      )
    },
    {
      key: "4",
      label: "Báo cáo rà soát vé",
      forceRender: true,
      children: (
        <div className="flex h-full min-h-0 flex-col">
          <ExamineTicketByPlan />
        </div>
      )
    },
    {
      key: "5",
      label: "Báo cáo số lượng Voucher",
      forceRender: true,
      children: (
        <div className="flex h-full min-h-0 flex-col">
          <Vouchers />
        </div>
      )
    },
    {
      key: "6",
      label: "Báo cáo giao dịch mua vé thẻ U22",
      forceRender: true,
      children: (
        <div className="flex h-full min-h-0 flex-col">
          <U22Usage />
        </div>
      )
    }
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-4 pt-4 pb-3">
      <PageHeader left={<AppBreadcrumb />} />

      <Tabs
        defaultActiveKey="1"
        type="card"
        items={items}
        className="flex h-full min-h-0 flex-col [&_.ant-tabs-content-holder]:min-h-0 [&_.ant-tabs-content-holder]:flex-1 [&_.ant-tabs-content]:h-full [&_.ant-tabs-content]:min-h-0 [&_.ant-tabs-tabpane]:h-full [&_.ant-tabs-tabpane]:min-h-0"
      />
    </div>
  );
};

export default StaffRevenueReportPage;
