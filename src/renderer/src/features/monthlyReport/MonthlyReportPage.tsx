import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import FullHeightTabs from "@renderer/components/FullHeightTabs";
import PageHeader from "@renderer/components/PageHeader";
import type { TabsProps } from "antd";
import Tab1 from "./components/tab1";
import Tab2 from "./components/tab2";
import Tab3 from "./components/tab3";

const MonthlyReportPage = () => {
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

      <FullHeightTabs defaultActiveKey="1" type="card" items={items} />
    </div>
  );
};

export default MonthlyReportPage;
