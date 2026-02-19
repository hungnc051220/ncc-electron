import { useOrders } from "@renderer/hooks/orders/useUsers";
import { formatNumber } from "@renderer/lib/utils";
import { OrderDetailProps } from "@shared/types";
import type { PaginationProps, TableProps } from "antd";
import { Breadcrumb, Button, Table } from "antd";
import dayjs from "dayjs";
import { Check, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";

const PrintOnlineTicketsPage = () => {
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const params = useMemo(
    () => ({
      current,
      pageSize,
      orderStatusId: 30
    }),
    [current, pageSize]
  );

  const { data, isFetching } = useOrders(params);

  const columns: TableProps<OrderDetailProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
      width: 50,
      fixed: "left"
    },

    {
      title: "Mã đặt vé",
      key: "barCode",
      dataIndex: "order",
      render: (order) => order.barCode,
      fixed: "left"
    },
    {
      title: "Thời gian mua",
      key: "createdOnUtc",
      dataIndex: "createdOnUtc",
      render: (createdOnUtc) => dayjs(createdOnUtc).format("HH:mm DD/MM/YYYY")
    },
    {
      title: "Tên khách hàng",
      key: "customerName",
      dataIndex: "order",
      render: (order) =>
        [order?.customerFirstName, order?.customerLastName].filter(Boolean).join(" ")
    },
    {
      title: "Số điện thoại",
      key: "customerPhone",
      dataIndex: "order",
      render: (order) => order.customerPhone
    },
    {
      title: "Email",
      key: "customerEmail",
      dataIndex: "order",
      render: (order) => order.customerEmail
    },
    {
      title: "Ngày chiếu",
      key: "projectDate",
      dataIndex: "planScreening",
      render: (planScreening) => dayjs(planScreening?.projectDate).format("DD/MM/YYYY")
    },
    {
      title: "Giờ chiếu",
      key: "projectTime",
      dataIndex: "planScreening",
      render: (planScreening) => dayjs(planScreening?.projectTime).format("HH:mm")
    },
    {
      title: "Số lượng vé",
      key: "numberOfTickets",
      dataIndex: "order",
      render: (_, record) => record.order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
    },
    {
      title: "Vị trí ghế",
      key: "positions",
      dataIndex: "order",
      render: (_, record) => record.order.items?.map((item) => item.listChairValueF1).join(", ")
    },
    {
      title: "Đã in",
      dataIndex: "order",
      key: "printedOnUtc",
      width: 60,
      render: (order) => (
        <div className="flex items-center justify-center">
          {order?.printedOnUtc ? (
            <Check className="size-4 text-green-500" />
          ) : (
            <X className="size-4 text-red-500" />
          )}
        </div>
      ),
      align: "center",
      fixed: "right"
    },
    {
      title: "",
      key: "operation",
      width: 80,
      render: (_, record) => (
        <Button type="link" onClick={() => console.log(record)}>
          In vé
        </Button>
      ),
      fixed: "right"
    }
  ];

  const onChange = (page: number) => {
    setCurrent(page);
  };

  const onShowSizeChange: PaginationProps["onShowSizeChange"] = (current, pageSize) => {
    setCurrent(current);
    setPageSize(pageSize);
  };

  return (
    <div className="space-y-3 mt-4 px-4">
      <Breadcrumb
        items={[
          {
            title: <Link to="/">Trang chủ</Link>
          },
          {
            title: "Bán vé"
          },
          {
            title: "In vé online"
          }
        ]}
      />

      <Table
        rowKey={(record) => record.order.id}
        dataSource={data?.data || []}
        columns={columns}
        bordered
        size="small"
        scroll={{ x: "max-content", y: "calc(100vh - 265px)" }}
        loading={isFetching}
        pagination={{
          current,
          onChange,
          total: data?.total || 0,
          size: "middle",
          pageSize,
          pageSizeOptions: [20, 50, 100],
          showSizeChanger: true,
          onShowSizeChange,
          showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`
        }}
      />
    </div>
  );
};

export default PrintOnlineTicketsPage;
