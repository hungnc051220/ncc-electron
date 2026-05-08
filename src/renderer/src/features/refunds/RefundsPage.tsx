import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import { MoreOutlined } from "@ant-design/icons";
import { useOrders } from "@renderer/hooks/orders/useOrders";
import {
  filterEmptyValues,
  formatMoney,
  formatNumber,
  formatSeatValues,
  compareText,
  compareNumber,
  compareNaturalText,
  compareDate
} from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { OrderDetailProps, RefundStatus } from "@shared/types";
import type { PaginationProps, TableProps } from "antd";
import { Dropdown } from "antd";
import dayjs from "dayjs";
import { Eye, RefreshCcw } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
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
      sorter: (a, b) => compareText(a.order?.barCode, b.order?.barCode),
      render: (order) => order.barCode,
      fixed: "left"
    },
    {
      title: "Mã thanh toán",
      key: "id",
      dataIndex: "order",
      sorter: (a, b) => compareNumber(a.order?.id, b.order?.id),
      render: (order) => order.id,
      fixed: "left"
    },
    {
      title: "Thời gian hủy vé",
      key: "createdOnUtc",
      dataIndex: "order",
      sorter: (a, b) =>
        compareDate(a.order?.cancelTicket?.createdOnUtc, b.order?.cancelTicket?.createdOnUtc),
      render: (_, { order }) =>
        order?.cancelTicket?.createdOnUtc
          ? dayjs(order.cancelTicket.createdOnUtc).format("HH:mm DD/MM/YYYY")
          : ""
    },
    {
      title: "Lý do hủy vé",
      key: "reason",
      dataIndex: "order",
      sorter: (a, b) => compareText(a.order?.cancelTicket?.reason, b.order?.cancelTicket?.reason),
      render: (_, { order }) => order?.cancelTicket?.reason
    },
    {
      title: "Tên khách hàng",
      key: "customerName",
      dataIndex: "order",
      sorter: (a, b) =>
        compareText(
          [a.order?.customerFirstName, a.order?.customerLastName].filter(Boolean).join(" "),
          [b.order?.customerFirstName, b.order?.customerLastName].filter(Boolean).join(" ")
        ),
      render: (order) =>
        [order?.customerFirstName, order?.customerLastName].filter(Boolean).join(" ")
    },
    {
      title: "Số điện thoại",
      key: "customerPhone",
      dataIndex: "order",
      sorter: (a, b) => compareText(a.order?.customerPhone, b.order?.customerPhone),
      render: (order) => order.customerPhone
    },
    {
      title: "Email",
      key: "customerEmail",
      dataIndex: "order",
      sorter: (a, b) => compareText(a.order?.customerEmail, b.order?.customerEmail),
      render: (order) => order.customerEmail
    },
    {
      title: "Phòng chiếu",
      key: "roomName",
      dataIndex: "room",
      sorter: (a, b) => compareNaturalText(a.room?.name, b.room?.name),
      render: (room) => room?.name
    },
    {
      title: "Ngày chiếu",
      key: "projectDate",
      dataIndex: "planScreening",
      sorter: (a, b) => compareDate(a.planScreening?.projectDate, b.planScreening?.projectDate),
      render: (planScreening) => dayjs(planScreening?.projectDate).format("DD/MM/YYYY")
    },
    {
      title: "Giờ chiếu",
      key: "projectTime",
      dataIndex: "planScreening",
      sorter: (a, b) => compareDate(a.planScreening?.projectTime, b.planScreening?.projectTime),
      render: (planScreening) => dayjs(planScreening?.projectTime).format("HH:mm")
    },
    {
      title: "Số lượng vé",
      key: "numberOfTickets",
      dataIndex: "order",
      sorter: (a, b) =>
        compareNumber(
          a.order?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
          b.order?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
        ),
      render: (_, record) => record.order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
    },
    {
      title: "Vị trí ghế",
      key: "positions",
      dataIndex: "order",
      sorter: (a, b) =>
        compareText(formatSeatValues(a.order?.items), formatSeatValues(b.order?.items)),
      render: (_, record) => formatSeatValues(record.order.items)
    },
    {
      title: "Số tiền đã hoàn",
      key: "refundedAmount",
      dataIndex: "order",
      sorter: (a, b) => compareNumber(a.order?.refundedAmount, b.order?.refundedAmount),
      render: (_, record) => formatMoney(record.order.refundedAmount),
      fixed: "right",
      align: "right"
    },
    {
      title: "Trạng thái xử lý",
      key: "refundStatusId",
      dataIndex: "order",
      sorter: (a, b) => compareNumber(a.order?.refundStatusId, b.order?.refundStatusId),
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
