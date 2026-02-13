import { MoreOutlined } from "@ant-design/icons";
import { OrderStatusBadge } from "@renderer/components/OrderStatusBadge";
import { useOrders } from "@renderer/hooks/orders/useUsers";
import { filterEmptyValues, formatMoney, formatNumber } from "@renderer/lib/utils";
import { OrderDetailProps } from "@renderer/types";
import type { PaginationProps, TableProps, TabsProps } from "antd";
import { Breadcrumb, Button, Dropdown, Table, Tabs } from "antd";
import dayjs from "dayjs";
import { useCallback, useMemo, useState } from "react";
import OrderDialog from "./components/OrderHistoryDialog";
import Filter from "./components/Filter";

const actionItems = [{ key: "1", label: "Xem chi tiết" }];

const items: TabsProps["items"] = [
  {
    key: "1",
    label: "Vé online"
  },
  {
    key: "2",
    label: "Vé offline"
  }
];

export interface ValuesProps {
  id?: string;
  barCode?: string;
  phoneNumber?: string;
  email?: string;
  dateRange?: [string, string];
}

const OrderHistoryPage = () => {
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filterValues, setFilterValues] = useState<ValuesProps>({});
  const [pickedOrderIds, setPickedOrderIds] = useState<number[]>([]);
  const [activeKey, setActiveKey] = useState("1");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OrderDetailProps | null>(null);

  const params = useMemo(() => {
    const { dateRange, ...rest } = filterValues;
    const filtered = filterEmptyValues(rest as Record<string, unknown>);

    if (dateRange && dateRange.length === 2) {
      filtered.fromDate = dayjs(dateRange[0]).startOf("day").toISOString();
      filtered.toDate = dayjs(dateRange[1]).endOf("day").toISOString();
    }

    return {
      current,
      pageSize,
      isOnline: activeKey === "1" ? true : false,
      ...filtered
    };
  }, [current, pageSize, filterValues, activeKey]);

  const { data: orders, isFetching } = useOrders(params);

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
      title: "Mã đơn",
      key: "id",
      dataIndex: "id",
      render: (_, record) => record.order.id,
      fixed: "left"
    },
    {
      title: "Mã đặt vé",
      key: "barCode",
      dataIndex: "barCode",
      render: (_, record) => record.order.barCode,
      fixed: "left"
    },
    {
      title: "Tiền thanh toán",
      key: "orderTotal",
      dataIndex: "orderTotal",
      render: (_, record) => formatMoney(record.order.orderTotal)
    },
    {
      title: "Thời gian mua",
      key: "createdOnUtc",
      dataIndex: "createdOnUtc",
      render: (_, record) => dayjs(record.order.createdOnUtc).format("DD/MM/YYYY")
    },
    {
      title: "Tên khách hàng",
      key: "customerName",
      dataIndex: "customerName",
      render: (_, record) => record.order.customerFirstName
    },
    {
      title: "Số điện thoại",
      key: "customerPhone",
      dataIndex: "customerPhone",
      render: (_, record) => record.order.customerPhone
    },
    {
      title: "Email",
      key: "customerEmail",
      dataIndex: "customerEmail",
      render: (_, record) => record.order.customerEmail
    },
    {
      title: "Tên phim",
      key: "filmName",
      dataIndex: "filmName",
      render: (_, record) => record.film?.filmName
    },
    {
      title: "Ngày chiếu",
      key: "projectDate",
      dataIndex: "projectDate",
      render: (_, record) =>
        record.planScreening
          ? dayjs(record.planScreening.projectDate, "YYYY-MM-DD").format("DD/MM/YYYY")
          : ""
    },
    {
      title: "Ngày chiếu",
      key: "projectTime",
      dataIndex: "projectTime",
      render: (_, record) =>
        record.planScreening ? dayjs(record.planScreening.projectTime).format("HH:mm") : ""
    },
    {
      title: "Số vé",
      key: "numberOfTickets",
      dataIndex: "numberOfTickets",
      render: (_, record) => record.order.items.reduce((a, b) => a + b.quantity, 0)
    },
    {
      title: "Vị trí ghế",
      key: "positions",
      dataIndex: "positions",
      render: (_, record) => record.order.items.map((item) => item.listChairValueF1).join(", ")
    },
    {
      title: "Trạng thái đơn",
      key: "orderStatusId",
      dataIndex: "orderStatusId",
      render: (_, record) => <OrderStatusBadge status={record.order.orderStatusId} type="order" />,
      fixed: "right"
    },
    {
      title: "Trạng thái thanh toán",
      key: "paymentStatusId",
      dataIndex: "paymentStatusId",
      render: (_, record) => (
        <OrderStatusBadge status={record.order.paymentStatusId} type="payment" />
      ),
      fixed: "right"
    },
    {
      title: "",
      key: "operation",
      width: 50,
      render: (_, record) => (
        <Dropdown
          menu={{
            items: actionItems,
            onClick: (e) => {
              if (e.key === "1") {
                handleViewDetail(record);
              }
            }
          }}
          arrow
          trigger={["click"]}
        >
          <MoreOutlined />
        </Dropdown>
      ),
      align: "center",
      fixed: "right"
    }
  ];

  const onSearch = (values: ValuesProps) => {
    setFilterValues(values);
  };

  const handleViewDetail = useCallback((item: OrderDetailProps) => {
    setSelectedItem(item);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedItem(null);
    }
  }, []);

  const onChange = (page: number) => {
    setCurrent(page);
  };

  const onShowSizeChange: PaginationProps["onShowSizeChange"] = (current, pageSize) => {
    setCurrent(current);
    setPageSize(pageSize);
  };

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setPickedOrderIds((prev) => {
      const pageFilmIds = orders?.data.map((f) => f.order.id) ?? [];

      const newKeys = newSelectedRowKeys as number[];

      const prevWithoutCurrentPage = prev.filter((id) => !pageFilmIds.includes(id));

      return [...prevWithoutCurrentPage, ...newKeys];
    });
  };

  const rowSelection: TableProps<OrderDetailProps>["rowSelection"] = {
    selectedRowKeys: pickedOrderIds,
    onChange: onSelectChange
  };

  return (
    <div className="mt-4 px-4">
      <div className="flex items-center justify-between">
        <Breadcrumb
          items={[
            {
              title: "Trang chủ",
              href: "/"
            },
            {
              title: "Tra cứu"
            },
            {
              title: "Lịch sử bán vé"
            }
          ]}
        />
        <div className="flex items-center gap-3">
          <div className="flex gap-6">
            <p className="text-xs">
              Số lượng vé xuất: <span className="font-semibold">{pickedOrderIds.length}</span>
            </p>
          </div>
          <Filter filterValues={filterValues} onSearch={onSearch} setCurrent={setCurrent} />
          <Button type="primary" disabled={pickedOrderIds.length === 0} onClick={() => {}}>
            Xuất vé điện tử
          </Button>
        </div>
      </div>

      <Tabs defaultActiveKey="1" items={items} activeKey={activeKey} onChange={setActiveKey} />

      <Table
        rowKey={(record) => record.order.id}
        dataSource={orders?.data || []}
        columns={columns}
        bordered
        size="small"
        scroll={{ x: "max-content", y: "calc(100vh - 320px)" }}
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
        rowSelection={{ type: "checkbox", ...rowSelection }}
      />

      {dialogOpen && (
        <OrderDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          selectedItem={selectedItem}
        />
      )}
    </div>
  );
};

export default OrderHistoryPage;
