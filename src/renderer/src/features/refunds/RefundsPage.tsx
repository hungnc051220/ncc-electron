import { MoreOutlined } from "@ant-design/icons";
import { useOrders } from "@renderer/hooks/orders/useOrders";
import { filterEmptyValues, formatMoney, formatNumber } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { OrderDetailProps, RefundStatus } from "@shared/types";
import type { PaginationProps, TableProps } from "antd";
import { Breadcrumb, Dropdown, Table } from "antd";
import dayjs from "dayjs";
import { Eye, RefreshCcw } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router";
import OrderDetailDialog from "../orderHistory/components/OrderDetailDialog";
import Filter from "./components/Filter";
import RefundStatusBadge from "./components/RefundStatusBadge";
import UpdateRefundStatusDialog from "./components/UpdateRefundStatusDialog";

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
  const [dialogUpdateRefundStatusOpen, setDialogUpdateRefundStatusOpen] = useState(false);
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
      isRefund: true,
      ...filtered
    };
  }, [current, pageSize, filterValues]);

  const { data: orders, isFetching } = useOrders(params);
  const { can } = usePermission();
  const canView = can("refunds", "view");
  const canUpdate = can("refunds", "update");

  const handeViewDetail = useCallback((item: OrderDetailProps) => {
    setSelectedItem(item);
    setDialogViewDetailOpen(true);
  }, []);

  const handleOpenUpdateRefundStatus = useCallback((item: OrderDetailProps) => {
    setSelectedItem(item);
    setDialogUpdateRefundStatusOpen(true);
  }, []);

  const handleDialogViewDetailClose = useCallback(
    (open: boolean) => {
      setDialogViewDetailOpen(open);
      if (!open && !dialogUpdateRefundStatusOpen) {
        setSelectedItem(null);
      }
    },
    [dialogUpdateRefundStatusOpen]
  );

  const handleDialogUpdateRefundStatusClose = useCallback(
    (open: boolean) => {
      setDialogUpdateRefundStatusOpen(open);
      if (!open && !dialogViewDetailOpen) {
        setSelectedItem(null);
      }
    },
    [dialogViewDetailOpen]
  );

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
      title: "Thời gian hủy vé",
      key: "createdOnUtc",
      dataIndex: "order",
      render: (_, { order }) =>
        order?.cancelTicket?.createdOnUtc
          ? dayjs(order.cancelTicket.createdOnUtc).format("HH:mm DD/MM/YYYY")
          : ""
    },
    {
      title: "Lý do hủy vé",
      key: "reason",
      dataIndex: "order",
      render: (_, { order }) => order?.cancelTicket?.reason
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
      title: "Phòng chiếu",
      key: "roomName",
      dataIndex: "room",
      render: (room) => room?.name
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
      title: "Số tiền đã hoàn",
      key: "refundedAmount",
      dataIndex: "order",
      render: (_, record) => formatMoney(record.order.refundedAmount),
      fixed: "right",
      align: "right"
    },
    {
      title: "Trạng thái xử lý",
      key: "refundStatusId",
      dataIndex: "order",
      render: (_, record) => <RefundStatusBadge status={record.order.refundStatusId} />,
      fixed: "right"
    },
    ...(canView || canUpdate
      ? [
          {
            title: "",
            key: "operation",
            width: 50,
            render: (_: unknown, record: OrderDetailProps) => {
              const actionItems = [
                ...(canView
                  ? [{ key: "view-detail", icon: <Eye size={16} />, label: "Xem chi tiết" }]
                  : []),
                ...(canUpdate && record.order.refundStatusId === RefundStatus.PENDING
                  ? [
                      {
                        key: "update-refund-status",
                        icon: <RefreshCcw size={16} />,
                        label: "Cập nhật trạng thái huỷ"
                      }
                    ]
                  : [])
              ];

              if (!actionItems.length) {
                return null;
              }

              return (
                <Dropdown
                  menu={{
                    items: actionItems,
                    onClick: (e) => {
                      if (e.key === "view-detail") {
                        handeViewDetail(record);
                      }

                      if (e.key === "update-refund-status") {
                        handleOpenUpdateRefundStatus(record);
                      }
                    }
                  }}
                  arrow
                  trigger={["click"]}
                >
                  <MoreOutlined />
                </Dropdown>
              );
            },
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
        <OrderDetailDialog
          open={dialogViewDetailOpen}
          onOpenChange={handleDialogViewDetailClose}
          selectedItem={selectedItem}
        />
      )}
      {dialogUpdateRefundStatusOpen && selectedItem && (
        <UpdateRefundStatusDialog
          open={dialogUpdateRefundStatusOpen}
          onOpenChange={handleDialogUpdateRefundStatusClose}
          selectedItem={selectedItem}
        />
      )}
    </div>
  );
};

export default RefundsPage;
