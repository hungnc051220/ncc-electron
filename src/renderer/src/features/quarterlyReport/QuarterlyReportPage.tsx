import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import PageHeader from "@renderer/components/PageHeader";
import type { TabsProps } from "antd";
import { Tabs } from "antd";
import Tab2 from "./components/tab2";
import Tab3 from "./components/tab3";
import Tab1 from "./components/tab1";

const QuarterlyReportPage = () => {
  const items: TabsProps["items"] = [
    {
      key: "1",
      label: "Thống kê buổi chiếu phim",
      forceRender: true,
      children: (
        <div className="flex h-full min-h-0 flex-col">
          <Tab1 />
        </div>
      )
    },
    {
      key: "2",
      label: "Thống kê doanh thu theo từng loại vé",
      forceRender: true,
      children: (
        <div className="flex h-full min-h-0 flex-col">
          <Tab2 />
        </div>
      )
    },
    {
      key: "3",
      label: "Thống kê doanh thu, khán giả theo phòng chiếu",
      forceRender: true,
      children: (
        <div className="flex h-full min-h-0 flex-col">
          <Tab3 />
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

export default QuarterlyReportPage;
