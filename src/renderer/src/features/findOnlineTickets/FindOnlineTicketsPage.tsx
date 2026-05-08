import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import type { PaginationProps, TableProps } from "antd";
import { Dropdown } from "antd";
import { useCallback, useMemo, useState } from "react";
import dayjs from "dayjs";
import { OrderDetailProps } from "@shared/types";
import {
  filterEmptyValues,
  formatNumber,
  formatSeatValues,
  compareText,
  compareNumber
} from "@renderer/lib/utils";
import { useOrders } from "@renderer/hooks/orders/useOrders";
import { OrderStatusBadge } from "@renderer/components/OrderStatusBadge";
import { usePermission } from "@renderer/permissions/usePermission";
import Filter from "./components/Filter";
import OrderDetailDialog from "../orderHistory/components/OrderDetailDialog";
import { MoreOutlined } from "@ant-design/icons";
import { Eye } from "lucide-react";

export interface ValuesProps {
  id?: string;
  barCode?: string;
  phoneNumber?: string;
  email?: string;
  dateRange?: [string, string];
}

export const getDefaultFilterValues = (): ValuesProps => ({
  dateRange: [dayjs().startOf("day").format(), dayjs().endOf("day").format()]
});

const FindOnlineTicketsPage = () => {
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filterValues, setFilterValues] = useState<ValuesProps>(() => getDefaultFilterValues());
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
  const canView = can("find_online_tickets", "view");

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
      sorter: (a, b) => compareText(a.order.barCode, b.order.barCode),
      render: (order) => order.barCode,
      fixed: "left"
    },
    {
      title: "Mã thanh toán",
      key: "id",
      dataIndex: "order",
      sorter: (a, b) => compareNumber(a.order.id, b.order.id),
      render: (order) => order.id,
      fixed: "left"
    },
    {
      title: "Thời gian mua",
      key: "createdOnUtc",
      dataIndex: "order",
      sorter: (a, b) =>
        dayjs(a.order.createdOnUtc).valueOf() - dayjs(b.order.createdOnUtc).valueOf(),
      render: (_, { order }) => dayjs(order.createdOnUtc).format("HH:mm DD/MM/YYYY")
    },
    {
      title: "Tên khách hàng",
      key: "customerName",
      dataIndex: "order",
      sorter: (a, b) =>
        compareText(
          [a.order.customerFirstName, a.order.customerLastName].filter(Boolean).join(" "),
          [b.order.customerFirstName, b.order.customerLastName].filter(Boolean).join(" ")
        ),
      render: (order) =>
        [order?.customerFirstName, order?.customerLastName].filter(Boolean).join(" ")
    },
    {
      title: "Số điện thoại",
      key: "customerPhone",
      dataIndex: "order",
      sorter: (a, b) => compareText(a.order.customerPhone, b.order.customerPhone),
      render: (order) => order.customerPhone
    },
    {
      title: "Email",
      key: "customerEmail",
      dataIndex: "order",
      sorter: (a, b) => compareText(a.order.customerEmail, b.order.customerEmail),
      render: (order) => order.customerEmail
    },
    {
      title: "Phòng chiếu",
      key: "roomName",
      dataIndex: "room",
      sorter: (a, b) => compareText(a.room?.name, b.room?.name),
      render: (room) => room?.name
    },
    {
      title: "Ngày chiếu",
      key: "projectDate",
      dataIndex: "planScreening",
      sorter: (a, b) =>
        dayjs(a.planScreening?.projectDate).valueOf() -
        dayjs(b.planScreening?.projectDate).valueOf(),
      render: (planScreening) => dayjs(planScreening?.projectDate).format("DD/MM/YYYY")
    },
    {
      title: "Giờ chiếu",
      key: "projectTime",
      dataIndex: "planScreening",
      sorter: (a, b) =>
        dayjs(a.planScreening?.projectTime).valueOf() -
        dayjs(b.planScreening?.projectTime).valueOf(),
      render: (planScreening) => dayjs(planScreening?.projectTime).format("HH:mm")
    },
    {
      title: "Số lượng vé",
      key: "numberOfTickets",
      dataIndex: "order",
      sorter: (a, b) =>
        compareNumber(
          a.order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
          b.order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
        ),
      render: (_, record) => record.order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
    },
    {
      title: "Vị trí ghế",
      key: "positions",
      dataIndex: "order",
      render: (_, record) => formatSeatValues(record.order.items)
    },

    {
      title: "Trạng thái thanh toán",
      key: "paymentStatus",
      dataIndex: "order",
      sorter: (a, b) => compareNumber(a.order.paymentStatusId, b.order.paymentStatusId),
      render: (_, record) => (
        <OrderStatusBadge status={record.order.paymentStatusId} type="payment" />
      ),
      fixed: "right"
    },
    {
      title: "Trạng thái đơn",
      key: "orderStatus",
      dataIndex: "order",
      sorter: (a, b) => compareNumber(a.order.orderStatusId, b.order.orderStatusId),
      render: (_, record) => <OrderStatusBadge status={record.order.orderStatusId} type="order" />,
      fixed: "right"
    },
    ...(canView
      ? [
          {
            title: "",
            key: "operation",
            width: 50,
            render: (_: unknown, record: OrderDetailProps) => (
              <Dropdown
                menu={{
                  items: [{ key: "1", icon: <Eye size={16} />, label: "Xem chi tiết" }],
                  onClick: (e) => {
                    if (e.key === "1") {
                      handeViewDetail(record);
                    }
                  }
                }}
                arrow
                trigger={["click"]}
              >
                <MoreOutlined />
              </Dropdown>
            ),
            align: "center" as const,
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
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-4 pt-4">
      <PageHeader
        left={<AppBreadcrumb />}
        right={<Filter onSearch={onSearch} filterValues={filterValues} setCurrent={setCurrent} />}
      />

      <AutoHeightTable
        rowKey={(record) => record.order.id}
        dataSource={orders?.data || []}
        columns={columns}
        bordered
        size="small"
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
        <OrderDetailDialog
          open={dialogViewDetailOpen}
          onOpenChange={handleDialogViewDetailClose}
          selectedItem={selectedItem}
        />
      )}
    </div>
  );
};

export default FindOnlineTicketsPage;
