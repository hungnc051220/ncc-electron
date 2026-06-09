import { MoreOutlined } from "@ant-design/icons";
import { cancellationReasonsApi } from "@renderer/api/cancellationReasons.api";
import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import { OrderStatusBadge } from "@renderer/components/OrderStatusBadge";
import RefreshButton from "@renderer/components/RefreshButton";
import { useCancelOrder } from "@renderer/hooks/orders/useCancelOrder";
import { useOrders } from "@renderer/hooks/orders/useOrders";
import { useUpdateOrder } from "@renderer/hooks/orders/useUpdateOrder";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { getPrintErrorMessage } from "@renderer/lib/print";
import {
  buildTicketsFromOrder,
  filterEmptyValues,
  formatSeatValues,
  formatMoney,
  formatNumber,
  compareText,
  compareNumber,
  compareNaturalText,
  resolveOrderPaymentStatus
} from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { OrderDetailProps, OrderStatus, PaymentStatus } from "@shared/types";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import type { PaginationProps, TableProps, TabsProps } from "antd";
import { Checkbox, Dropdown, Form, Modal, Select, Tabs, Typography } from "antd";
import dayjs from "dayjs";
import { CircleStop, Eye, Printer, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import OrderDetailDialog from "./components/OrderDetailDialog";
import Filter from "./components/Filter";
import { useAuthStore } from "@renderer/store/auth.store";
import { useUserDetail } from "@renderer/hooks/users/useUserDetail";
import { useSettingPosStore } from "@renderer/store/settingPos.store";
import { usePrinterStore } from "@renderer/store/printer.store";
import { useAntdApp } from "@renderer/hooks/useAntdApp";
import { ordersKeys } from "@renderer/hooks/orders/keys";
import { getCurrentDayDateRange, isCurrentDayDateRange } from "./dateFilter";

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

type CancelOrderFormValues = {
  cancelReasonId: number;
  isRefund: boolean;
};

const getSellerName = (orderDetail: OrderDetailProps) =>
  [orderDetail.order?.seller?.customerFirstName, orderDetail.order?.seller?.customerLastName]
    .filter(Boolean)
    .join(" ") || orderDetail.order?.seller?.username;

const OrderHistoryPage = () => {
  const { message } = useAntdApp();
  const queryClient = useQueryClient();

  const [cancelForm] = Form.useForm<CancelOrderFormValues>();
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filterValues, setFilterValues] = useState<ValuesProps>(() => ({
    dateRange: getCurrentDayDateRange()
  }));
  const [followsCurrentDay, setFollowsCurrentDay] = useState(true);
  const [activeKey, setActiveKey] = useState("1");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [endOrderDialogOpen, setEndOrderDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OrderDetailProps | null>(null);
  const [selectedCancelOrder, setSelectedCancelOrder] = useState<OrderDetailProps | null>(null);
  const [selectedEndOrder, setSelectedEndOrder] = useState<OrderDetailProps | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const userId = useAuthStore((s) => s.userId);
  const { posShortName } = useSettingPosStore();
  const selectedPrinter = usePrinterStore((s) => s.selectedPrinter);
  const { data: user } = useUserDetail(userId!);
  const { can } = usePermission();
  const canView = can("order_history", "view");
  const canPrint = can("order_history", "print");
  const cancelOrder = useCancelOrder();
  const updateOrder = useUpdateOrder();

  const params = useMemo(() => {
    const { dateRange, ...rest } = filterValues;
    const filtered = filterEmptyValues(rest as Record<string, unknown>);

    if (dateRange && dateRange.length === 2) {
      filtered.fromDate = dayjs(dateRange[0]).startOf("day").format();
      filtered.toDate = dayjs(dateRange[1]).endOf("day").format();
    }

    return {
      current,
      pageSize,
      isOnline: activeKey === "1" ? true : false,
      ...filtered
    };
  }, [current, pageSize, filterValues, activeKey]);

  const { data: orders, isFetching, refetch } = useOrders(params);
  const {
    data: cancellationReasons,
    fetchNextPage,
    hasNextPage,
    isFetching: isFetchingCancellationReasons,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ["cancellation-reasons"],
    queryFn: ({ pageParam = 1 }) =>
      cancellationReasonsApi.getAll({ current: pageParam, pageSize: 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const currentPage = pages.length;
      return currentPage < lastPage.pageCount ? currentPage + 1 : undefined;
    }
  });

  const cancelReasonOptions = useMemo(
    () =>
      cancellationReasons?.pages.flatMap((page) =>
        page.data.map((item) => ({
          value: item.id,
          label: item.reason
        }))
      ) ?? [],
    [cancellationReasons]
  );

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

  const handleOpenCancelDialog = useCallback(
    (orderDetail: OrderDetailProps) => {
      setSelectedCancelOrder(orderDetail);
      cancelForm.resetFields();
      setCancelDialogOpen(true);
    },
    [cancelForm]
  );

  const handleCancelDialogClose = useCallback(
    (open: boolean) => {
      setCancelDialogOpen(open);

      if (!open) {
        cancelForm.resetFields();
        setSelectedCancelOrder(null);
      }
    },
    [cancelForm]
  );

  const handleCancelOrder = useCallback(
    (values: CancelOrderFormValues) => {
      if (!selectedCancelOrder) {
        return;
      }

      const cancelledOrderId = selectedCancelOrder.order.id;
      const cancelledPlanScreenId = selectedCancelOrder.planScreening.id;

      cancelOrder.mutate(
        {
          planScreenId: cancelledPlanScreenId,
          orderIds: [cancelledOrderId],
          cancelReasonId: values.cancelReasonId,
          isRefund: values.isRefund
        },
        {
          onSuccess: async () => {
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ordersKeys.getAll(params) }),
              queryClient.invalidateQueries({ queryKey: ordersKeys.getDetail(cancelledOrderId) })
            ]);
            handleCancelDialogClose(false);
            message.success("Hủy vé thành công");
          },
          onError: (error: unknown) => {
            message.error(getApiErrorMessage(error, "Hủy vé thất bại"));
          }
        }
      );
    },
    [cancelOrder, handleCancelDialogClose, message, params, queryClient, selectedCancelOrder]
  );

  const handleOpenEndOrderDialog = useCallback((orderDetail: OrderDetailProps) => {
    setSelectedEndOrder(orderDetail);
    setEndOrderDialogOpen(true);
  }, []);

  const handleEndOrderDialogClose = useCallback((open: boolean) => {
    setEndOrderDialogOpen(open);

    if (!open) {
      setSelectedEndOrder(null);
    }
  }, []);

  const handleEndOrder = useCallback(() => {
    if (!selectedEndOrder) {
      return;
    }

    updateOrder.mutate(
      {
        id: selectedEndOrder.order.id,
        dto: {
          orderStatusId: OrderStatus.FAIL,
          shippingStatusId: selectedEndOrder.order.shippingStatusId,
          paymentStatusId: selectedEndOrder.order.paymentStatusId
        }
      },
      {
        onSuccess: () => {
          handleEndOrderDialogClose(false);
          message.success("Kết thúc đơn thành công");
        },
        onError: (error: unknown) => {
          message.error(getApiErrorMessage(error, "Kết thúc đơn thất bại"));
        }
      }
    );
  }, [handleEndOrderDialogClose, message, selectedEndOrder, updateOrder]);

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
      sorter: (a, b) => compareNumber(a.order.id, b.order.id),
      render: (_, record) => record.order.id,
      fixed: "left"
    },
    {
      title: "Mã đặt vé",
      key: "barCode",
      dataIndex: "barCode",
      sorter: (a, b) => compareText(a.order.barCode, b.order.barCode),
      render: (_, record) => record.order.barCode,
      fixed: "left"
    },
    {
      title: "Tiền thanh toán",
      key: "orderTotal",
      dataIndex: "orderTotal",
      sorter: (a, b) => compareNumber(a.order.orderTotal, b.order.orderTotal),
      render: (_, record) => formatMoney(record.order.orderTotal)
    },
    {
      title: "Thời gian mua",
      key: "createdOnUtc",
      dataIndex: "createdOnUtc",
      sorter: (a, b) =>
        dayjs(a.order.createdOnUtc).valueOf() - dayjs(b.order.createdOnUtc).valueOf(),
      render: (_, record) => dayjs(record.order.createdOnUtc).format("HH:mm DD/MM/YYYY")
    },
    ...(activeKey === "2"
      ? [
          {
            title: "Nhân viên bán",
            key: "seller",
            dataIndex: "seller",
            sorter: (a, b) => compareText(getSellerName(a), getSellerName(b)),
            render: (_, record) => getSellerName(record)
          },
          {
            title: "Máy bán",
            key: "posName",
            dataIndex: "posName",
            sorter: (a, b) => compareText(a.order.items?.[0]?.posName, b.order.items?.[0]?.posName),
            render: (_, record) => record.order.items?.[0]?.posName
          }
        ]
      : []),
    {
      title: "Tên khách hàng",
      key: "customerName",
      dataIndex: "customerName",
      sorter: (a, b) =>
        compareText(
          [a.order.customerFirstName, a.order.customerLastName].filter(Boolean).join(" "),
          [b.order.customerFirstName, b.order.customerLastName].filter(Boolean).join(" ")
        ),
      render: (_, record) =>
        [record.order.customerFirstName, record.order.customerLastName].filter(Boolean).join(" ")
    },
    {
      title: "Số điện thoại",
      key: "customerPhone",
      dataIndex: "customerPhone",
      sorter: (a, b) => compareText(a.order.customerPhone, b.order.customerPhone),
      render: (_, record) => record.order.customerPhone
    },
    {
      title: "Email",
      key: "customerEmail",
      dataIndex: "customerEmail",
      sorter: (a, b) => compareText(a.order.customerEmail, b.order.customerEmail),
      render: (_, record) => record.order.customerEmail
    },
    {
      title: "Tên phim",
      key: "filmName",
      dataIndex: "filmName",
      sorter: (a, b) => compareText(a.film?.filmName, b.film?.filmName),
      render: (_, record) => record.film?.filmName
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
      dataIndex: "projectDate",
      sorter: (a, b) =>
        dayjs(a.planScreening?.projectDate, "YYYY-MM-DD").valueOf() -
        dayjs(b.planScreening?.projectDate, "YYYY-MM-DD").valueOf(),
      render: (_, record) =>
        record.planScreening
          ? dayjs(record.planScreening.projectDate, "YYYY-MM-DD").format("DD/MM/YYYY")
          : ""
    },
    {
      title: "Giờ chiếu",
      key: "projectTime",
      dataIndex: "projectTime",
      sorter: (a, b) =>
        dayjs(a.planScreening?.projectTime).valueOf() -
        dayjs(b.planScreening?.projectTime).valueOf(),
      render: (_, record) =>
        record.planScreening ? dayjs(record.planScreening.projectTime).format("HH:mm") : ""
    },
    {
      title: "Số vé",
      key: "numberOfTickets",
      dataIndex: "numberOfTickets",
      sorter: (a, b) =>
        compareNumber(
          a.order.items.reduce((total, item) => total + item.quantity, 0),
          b.order.items.reduce((total, item) => total + item.quantity, 0)
        ),
      render: (_, record) => record.order.items.reduce((a, b) => a + b.quantity, 0)
    },
    {
      title: "Vị trí ghế",
      key: "positions",
      dataIndex: "positions",
      render: (_, record) => {
        const seatCodes = formatSeatValues(record.order.items);
        return (
          <Typography.Text
            style={{ width: 200 }}
            className="max-w-full"
            ellipsis={{ tooltip: seatCodes || undefined }}
          >
            {seatCodes || "-"}
          </Typography.Text>
        );
      }
    },
    {
      title: "Mã VĐT",
      key: "invNo",
      sorter: (a, b) => compareText(a.order.invNo, b.order.invNo),
      render: (_, record) => record.order.invNo
    },
    {
      title: "Trạng thái thanh toán",
      key: "paymentStatusId",
      dataIndex: "paymentStatusId",
      sorter: (a, b) =>
        compareNumber(resolveOrderPaymentStatus(a.order), resolveOrderPaymentStatus(b.order)),
      render: (_, record) => (
        <OrderStatusBadge status={resolveOrderPaymentStatus(record.order)} type="payment" />
      ),
      fixed: "right"
    },
    {
      title: "Trạng thái đơn",
      key: "orderStatusId",
      dataIndex: "orderStatusId",
      sorter: (a, b) => compareNumber(a.order.orderStatusId, b.order.orderStatusId),
      render: (_, record) => <OrderStatusBadge status={record.order.orderStatusId} type="order" />,
      fixed: "right"
    },

    {
      title: "",
      key: "operation",
      width: 50,
      render: (_: unknown, record: OrderDetailProps) => {
        const paymentStatusId = resolveOrderPaymentStatus(record.order);
        const canEndOrder =
          record.order.orderStatusId === OrderStatus.PENDING &&
          paymentStatusId === PaymentStatus.PENDING;
        const canCancel =
          !canEndOrder &&
          record.order.orderStatusId !== OrderStatus.CANCELLED &&
          record.order.orderStatusId !== OrderStatus.FAIL;
        const canPrintTicket =
          canPrint &&
          record.order.orderStatusId === OrderStatus.COMPLETED &&
          paymentStatusId === PaymentStatus.PAID;
        const menuItems = [
          ...(canView ? [{ key: "1", icon: <Eye size={16} />, label: "Xem chi tiết" }] : []),
          ...(canPrintTicket ? [{ key: "2", icon: <Printer size={16} />, label: "In vé" }] : []),
          ...(canCancel ? [{ key: "3", icon: <X size={16} />, label: "Hủy vé" }] : []),
          ...(canEndOrder
            ? [{ key: "4", icon: <CircleStop size={16} />, label: "Kết thúc đơn" }]
            : [])
        ];

        if (menuItems.length === 0) {
          return null;
        }

        return (
          <Dropdown
            menu={{
              items: menuItems,
              onClick: (e) => {
                if (e.key === "1") {
                  handleViewDetail(record);
                }

                if (e.key === "2") {
                  handlePrint(record);
                }

                if (e.key === "3") {
                  handleOpenCancelDialog(record);
                }

                if (e.key === "4") {
                  handleOpenEndOrderDialog(record);
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
  ];

  const onSearch = (values: ValuesProps) => {
    setFollowsCurrentDay(isCurrentDayDateRange(values.dateRange));
    setFilterValues(values);
  };

  const handleOpenFilter = () => {
    if (!followsCurrentDay) {
      return;
    }

    setFilterValues((values) => ({
      ...values,
      dateRange: getCurrentDayDateRange()
    }));
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
        right={
          <>
            <Filter
              filterValues={filterValues}
              onOpen={handleOpenFilter}
              onSearch={onSearch}
              setCurrent={setCurrent}
            />
            <RefreshButton loading={isFetching} onRefresh={() => refetch()} />
          </>
        }
      />

      <Tabs
        defaultActiveKey="1"
        items={items}
        activeKey={activeKey}
        onChange={(key) => {
          setActiveKey(key);
          setCurrent(1);
        }}
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

      <Modal
        title="Xác nhận hủy vé"
        open={cancelDialogOpen}
        onOk={() => cancelForm.submit()}
        onCancel={() => handleCancelDialogClose(false)}
        okText="Xác nhận"
        cancelText="Đóng"
        okButtonProps={{
          loading: cancelOrder.isPending
        }}
        cancelButtonProps={{
          disabled: cancelOrder.isPending
        }}
        forceRender
        modalRender={(dom) => (
          <Form<CancelOrderFormValues>
            form={cancelForm}
            onFinish={handleCancelOrder}
            autoComplete="off"
            layout="vertical"
            initialValues={{
              isRefund: false
            }}
          >
            {dom}
          </Form>
        )}
        destroyOnHidden
      >
        <Form.Item<CancelOrderFormValues>
          name="cancelReasonId"
          label="Lý do hủy vé"
          rules={[{ required: true, message: "Chọn lý do hủy vé" }]}
        >
          <Select
            loading={isFetchingCancellationReasons || isFetchingNextPage}
            options={cancelReasonOptions}
            placeholder="Chọn lý do hủy vé"
            onPopupScroll={(e) => {
              const target = e.target as HTMLElement;

              if (
                hasNextPage &&
                !isFetchingNextPage &&
                target.scrollHeight - target.scrollTop <= target.clientHeight + 50
              ) {
                fetchNextPage();
              }
            }}
            allowClear
          />
        </Form.Item>

        <Form.Item<CancelOrderFormValues> name="isRefund" valuePropName="checked">
          <Checkbox>Hoàn tiền</Checkbox>
        </Form.Item>
      </Modal>

      <Modal
        open={endOrderDialogOpen}
        title="Xác nhận kết thúc đơn"
        onOk={handleEndOrder}
        onCancel={() => handleEndOrderDialogClose(false)}
        okText="Xác nhận"
        cancelText="Đóng"
        okButtonProps={{
          danger: true
        }}
        cancelButtonProps={{
          disabled: updateOrder.isPending
        }}
        confirmLoading={updateOrder.isPending}
        destroyOnHidden
      >
        Bạn có chắc chắn muốn kết thúc đơn
        {selectedEndOrder ? <strong>{` #${selectedEndOrder.order.id}`}</strong> : null}? Thao tác
        không thể thu hồi.
      </Modal>
    </div>
  );
};

export default OrderHistoryPage;
