"use client";

import { Breadcrumb, Tabs } from "antd";
import type { TabsProps } from "antd";
import TabActivityLog from "./components/tab-activity-log";
import TabActivityLogDetail from "./components/tab-activity-log-detail";

const items: TabsProps["items"] = [
  {
    key: "1",
    label: "Xem người cập nhật cuối",
    children: <TabActivityLog />,
  },
  {
    key: "2",
    label: "Xem chi tiết lịch sử thay đổi",
    children: <TabActivityLogDetail />,
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
            title: "Tra cứu",
          },
          {
            title: "Lịch sử hoạt động",
          },
        ]}
      />

      <Tabs defaultActiveKey="1" items={items} />
    </div>
  );
};

export default AccessHistoryPage;
