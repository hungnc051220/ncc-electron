import { Breadcrumb, Tabs } from "antd";
import type { TabsProps } from "antd";
import { Link } from "react-router";
import TabActivityLogDetail from "./components/TabActivityLogDetail";
import TabActivityLog from "./components/TabActivityLog";

const items: TabsProps["items"] = [
  {
    key: "1",
    label: "Xem người cập nhật cuối",
    children: <TabActivityLog />
  },
  {
    key: "2",
    label: "Xem chi tiết lịch sử thay đổi",
    children: <TabActivityLogDetail />
  }
];

const AccessHistoryPage = () => {
  return (
    <div className="space-y-3 mt-4 px-4">
      <Breadcrumb
        items={[
          {
            title: <Link to="/">Trang chủ</Link>
          },
          {
            title: "Tra cứu"
          },
          {
            title: "Lịch sử hoạt động"
          }
        ]}
      />

      <Tabs defaultActiveKey="1" items={items} />
    </div>
  );
};

export default AccessHistoryPage;
