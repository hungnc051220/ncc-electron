import type { PaginationProps, TableProps } from "antd";
import { Breadcrumb, Button, Table } from "antd";
import { useCallback, useMemo, useState } from "react";
import dayjs from "dayjs";
import { Link } from "react-router";
import { OrderDetailProps } from "@shared/types";
import { filterEmptyValues, formatMoney, formatNumber } from "@renderer/lib/utils";
import { useOrders } from "@renderer/hooks/orders/useOrders";
import { OrderStatusBadge } from "@renderer/components/OrderStatusBadge";
import { usePermission } from "@renderer/permissions/usePermission";
import Filter from "./components/Filter";
import OrderHistoryDialog from "../orderHistory/components/OrderHistoryDialog";

export interface ValuesProps {
  id?: string;
  barCode?: string;
  phoneNumber?: string;
  email?: string;
  dateRange?: [string, string];
}

const RefundsPage = () => {
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filterValues, setFilterValues] = useState<ValuesProps>({});
  const [dialogViewDetailOpen, setDialogViewDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OrderDetailProps | null>(null);

  const params = useMemo(() => {
    const { dateRange, ...rest } = filterValues;
    const filtered = filterEmptyValues(rest as Record<string, unknown>);

    filtered.isOnline = true;

    if (dateRange && dateRange.length === 2) {
      filtered.fromDate = dayjs(dateRange[0]).startOf("day").toISOString();
      filtered.toDate = dayjs(dateRange[1]).endOf("day").toISOString();
    }

    return {
      current,
      pageSize,
      ...filtered
    };
  }, [current, pageSize, filterValues]);

  const { data: orders, isFetching } = useOrders(params);
  const { can } = usePermission();
  const canView = can("refunds", "view");

  const handeViewDetail = useCallback((item: OrderDetailProps) => {
    setSelectedItem(item);
    setDialogViewDetailOpen(true);
  }, []);

  const handleDialogViewDetailClose = useCallback((open: boolean) => {
    setDialogViewDetailOpen(open);
    if (!open) {
      setSelectedItem(null);
    }
  }, []);

  const columns: TableProps<OrderDetailProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => (current - 1) * 100 + index + 1,
      width: 50,
      fixed: "left"
    },
    {
      title: "Mã vé",
      key: "barCode",
      dataIndex: "order",
      render: (order) => order.barCode,
      fixed: "left"
    },
    {
      title: "Mã thanh toán",
      key: "id",
      dataIndex: "order",
      render: (order) => order.id,
      fixed: "left"
    },
    {
      title: "Thời gian mua",
      key: "createdOnUtc",
      dataIndex: "order",
      render: (_, { order }) => dayjs(order.createdOnUtc).format("HH:mm DD/MM/YYYY")
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
      title: "Trạng thái thanh toán",
      key: "paymentStatus",
      dataIndex: "order",
      render: (_, record) => (
        <OrderStatusBadge status={record.order.paymentStatusId} type="payment" />
      ),
      fixed: "right"
    },
    {
      title: "Trạng thái đơn",
      key: "orderStatus",
      dataIndex: "order",
      render: (_, record) => (
        <OrderStatusBadge status={record.order.paymentStatusId} type="order" />
      ),
      fixed: "right"
    },
    {
      title: "Số tiền đã hoàn",
      key: "refundedAmount",
      dataIndex: "order",
      render: (_, record) => formatMoney(record.order.refundedAmount),
      fixed: "right",
      align: "right"
    },
    ...(canView
      ? [
          {
            title: "",
            key: "operation",
            width: 120,
            render: (_: unknown, record: OrderDetailProps) => (
              <Button type="link" onClick={() => handeViewDetail(record)}>
                Xem chi tiết
              </Button>
            ),
            fixed: "right" as const
          }
        ]
      : [])
  ];

  const onSearch = (values: ValuesProps) => {
    setFilterValues(values);
  };

  const onChange = (page: number) => {
    setCurrent(page);
  };

  const onShowSizeChange: PaginationProps["onShowSizeChange"] = (current, pageSize) => {
    setCurrent(current);
    setPageSize(pageSize);
  };

  return (
    <div className="space-y-3 mt-4 px-4">
      <div className="flex items-center justify-between">
        <Breadcrumb
          items={[
            {
              title: <Link to="/">Trang chủ</Link>
            },
            {
              title: "Bán vé"
            },
            {
              title: "Hoàn tiền"
            }
          ]}
        />
        <Filter onSearch={onSearch} filterValues={filterValues} setCurrent={setCurrent} />
      </div>

      <Table
        rowKey={(record) => record.order.id}
        dataSource={orders?.data || []}
        columns={columns}
        bordered
        size="small"
        scroll={{ x: "max-content", y: "calc(100vh - 265px)" }}
        loading={isFetching}
        pagination={{
          current,
          onChange,
          total: orders?.total || 0,
          size: "middle",
          pageSize,
          pageSizeOptions: [20, 50, 100],
          showSizeChanger: true,
          onShowSizeChange,
          showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`
        }}
      />

      {dialogViewDetailOpen && selectedItem && (
        <OrderHistoryDialog
          open={dialogViewDetailOpen}
          onOpenChange={handleDialogViewDetailClose}
          selectedItem={selectedItem}
        />
      )}
    </div>
  );
};

export default RefundsPage;
