import type { TabsProps } from "antd";
import { Breadcrumb, Tabs } from "antd";
import Tab2 from "./components/tab2";
import Tab3 from "./components/tab3";
import Tab1 from "./components/tab1";
import Tab4 from "./components/tab4";

const YearlyReportPage = () => {
  const items: TabsProps["items"] = [
    {
      key: "1",
      label: "Thông kê, tổng hợp buổi chiếu, lượng khán giả",
      children: <Tab1 />
    },
    {
      key: "2",
      label: "Thống kê phim Việt",
      children: <Tab2 />
    },
    {
      key: "3",
      label: "Doanh thu đối tác",
      children: <Tab3 />
    },
    {
      key: "4",
      label: "Tổng hợp số liệu phim chiếu",
      children: <Tab4 />
    }
  ];

  return (
    <div className="space-y-3 mt-4 px-4">
      <div className="flex items-center justify-between">
        <Breadcrumb
          items={[
            {
              title: "Trang chủ",
              href: "/"
            },
            {
              title: "Thống kê, báo cáo"
            },
            {
              title: "Báo cáo năm"
            }
          ]}
        />
      </div>

      <Tabs defaultActiveKey="1" items={items} />
    </div>
  );
};

export default YearlyReportPage;
