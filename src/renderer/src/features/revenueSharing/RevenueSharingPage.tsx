import { Breadcrumb, Card, Empty } from "antd";
import { Link } from "react-router";

const RevenueSharingPage = () => {
  return (
    <div className="space-y-4 p-4">
      <Breadcrumb
        items={[
          {
            title: <Link to="/">Trang chủ</Link>
          },
          {
            title: "Quản lý danh sách"
          },
          {
            title: "Quản lý phân chia doanh thu"
          }
        ]}
      />

      <Card title="Quản lý phân chia doanh thu">
        <Empty
          description="Màn hình khung đã sẵn sàng. Chức năng và API sẽ được bổ sung sau."
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    </div>
  );
};

export default RevenueSharingPage;
