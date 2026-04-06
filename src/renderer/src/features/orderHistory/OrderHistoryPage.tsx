import { MoreOutlined } from "@ant-design/icons";
import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import { OrderStatusBadge } from "@renderer/components/OrderStatusBadge";
import { useOrders } from "@renderer/hooks/orders/useOrders";
import { getPrintErrorMessage } from "@renderer/lib/print";
import {
  buildTicketsFromOrder,
  filterEmptyValues,
  formatMoney,
  formatNumber
} from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { OrderDetailProps } from "@shared/types";
import type { PaginationProps, TableProps, TabsProps } from "antd";
import { Dropdown, message, Tabs } from "antd";
import dayjs from "dayjs";
import { Eye, Printer } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import OrderDetailDialog from "./components/OrderDetailDialog";
import Filter from "./components/Filter";
import { useAuthStore } from "@renderer/store/auth.store";
import { useUserDetail } from "@renderer/hooks/users/useUserDetail";
import { useSettingPosStore } from "@renderer/store/settingPos.store";
import { usePrinterStore } from "@renderer/store/printer.store";

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
  const [activeKey, setActiveKey] = useState("1");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OrderDetailProps | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const userId = useAuthStore((s) => s.userId);
  const { posShortName } = useSettingPosStore();
  const selectedPrinter = usePrinterStore((s) => s.selectedPrinter);
  const { data: user } = useUserDetail(userId!);
  const { can } = usePermission();
  const canView = can("order_history", "view");
  const canPrint = can("order_history", "print");

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

  useEffect(() => {
    const reopenOrderIdParam = searchParams.get("reopenOrderId");

    if (!reopenOrderIdParam) {
      return;
    }

    const reopenOrderId = Number(reopenOrderIdParam);

    if (!reopenOrderId) {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.delete("reopenOrderId");
      setSearchParams(nextSearchParams, { replace: true });
      return;
    }

    const matchedOrder = orders?.data.find((item) => item.order.id === reopenOrderId) ?? null;

    setSelectedOrderId(reopenOrderId);
    setSelectedItem(matchedOrder);
    setDialogOpen(true);

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("reopenOrderId");
    setSearchParams(nextSearchParams, { replace: true });
  }, [orders?.data, searchParams, setSearchParams]);

  const handlePrint = async (orderDetail: OrderDetailProps) => {
    const messageKey = `order-history-print-${orderDetail.order.id}`;

    message.loading({
      key: messageKey,
      content: "Đang in vé..."
    });

    try {
      const tickets = await buildTicketsFromOrder(orderDetail, user?.fullname, posShortName);
      await window.api.printTickets(tickets, selectedPrinter);
      message.success({
        key: messageKey,
        content: "In vé thành công"
      });
    } catch (error) {
      message.error({
        key: messageKey,
        content: getPrintErrorMessage(error),
        duration: 4
      });
    }
  };

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
      render: (_, record) => dayjs(record.order.createdOnUtc).format("HH:mm DD/MM/YYYY")
    },
    ...(activeKey === "2"
      ? [
          {
            title: "Máy bán",
            key: "posName",
            dataIndex: "posName",
            render: (_, record) => record.order.items?.[0]?.posName
          }
        ]
      : []),
    {
      title: "Tên khách hàng",
      key: "customerName",
      dataIndex: "customerName",
      render: (_, record) =>
        [record.order.customerFirstName, record.order.customerLastName].filter(Boolean).join(" ")
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
      title: "Phòng chiếu",
      key: "roomName",
      dataIndex: "room",
      render: (room) => room?.name
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
      title: "Giờ chiếu",
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
      title: "Trạng thái thanh toán",
      key: "paymentStatusId",
      dataIndex: "paymentStatusId",
      render: (_, record) => (
        <OrderStatusBadge status={record.order.paymentStatusId} type="payment" />
      ),
      fixed: "right"
    },
    {
      title: "Trạng thái đơn",
      key: "orderStatusId",
      dataIndex: "orderStatusId",
      render: (_, record) => <OrderStatusBadge status={record.order.orderStatusId} type="order" />,
      fixed: "right"
    },

    ...(canView || canPrint
      ? [
          {
            title: "",
            key: "operation",
            width: 50,
            render: (_: unknown, record: OrderDetailProps) => {
              const items = [
                ...(canView ? [{ key: "1", icon: <Eye size={16} />, label: "Xem chi tiết" }] : []),
                ...(canPrint ? [{ key: "2", icon: <Printer size={16} />, label: "In vé" }] : [])
              ];

              return (
                <Dropdown
                  menu={{
                    items,
                    onClick: (e) => {
                      if (e.key === "1") {
                        handleViewDetail(record);
                      }

                      if (e.key === "2") {
                        handlePrint(record);
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

  const handleViewDetail = useCallback((item: OrderDetailProps) => {
    setSelectedOrderId(item.order.id);
    setSelectedItem(item);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedOrderId(null);
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

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-4 pt-4">
      <PageHeader
        left={<AppBreadcrumb />}
        right={<Filter filterValues={filterValues} onSearch={onSearch} setCurrent={setCurrent} />}
      />

      <Tabs
        defaultActiveKey="1"
        items={items}
        activeKey={activeKey}
        onChange={setActiveKey}
        type="card"
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

      {dialogOpen && (
        <OrderDetailDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          selectedOrderId={selectedOrderId}
          selectedItem={selectedItem}
        />
      )}
    </div>
  );
};

export default OrderHistoryPage;
