import { useAntdApp } from "@renderer/hooks/useAntdApp";

import { cancellationReasonsApi } from "@renderer/api/cancellationReasons.api";
import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import { MoreOutlined } from "@ant-design/icons";
import { useCancelOrder } from "@renderer/hooks/orders/useCancelOrder";
import { useOrders } from "@renderer/hooks/orders/useOrders";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { cn, extractSeatValues, filterEmptyValues, formatNumber } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { OrderDetailProps, OrderStatus } from "@shared/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { PaginationProps, TableProps } from "antd";
import { Button, Dropdown, Form, Modal, Select, Tag, Tooltip } from "antd";
import dayjs from "dayjs";
import { Eye, Printer, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import OrderDetailDialog from "../orderHistory/components/OrderDetailDialog";
import Filter from "./components/Filter";
import PrintInvitationTicketDialog from "./components/PrintInvitationTicketDialog";

export interface ValuesProps {
  dateRange?: [string, string];
}

type CancelOrderFormValues = {
  cancelReasonId: number;
};

const compareText = (left?: string | null, right?: string | null) =>
  (left || "").localeCompare(right || "", "vi", { sensitivity: "base" });

const compareNumber = (left?: number | null, right?: number | null) => (left || 0) - (right || 0);

const compareNaturalText = (left?: string | null, right?: string | null) =>
  (left || "").localeCompare(right || "", "vi", { numeric: true, sensitivity: "base" });

const compareDate = (left?: string | null, right?: string | null) =>
  dayjs(left).valueOf() - dayjs(right).valueOf();

const renderInvitationTicketStatus = (status?: string | null) => {
  const normalizedStatus = status?.toLowerCase();
  const configMap: Record<string, { label: string; color: string; className: string }> = {
    new: {
      label: "Mới",
      color: "processing",
      className:
        "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300"
    },
    sent: {
      label: "Đã gửi",
      color: "success",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
    },
    failed: {
      label: "Gửi lỗi",
      color: "error",
      className:
        "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
    }
  };

  const config = normalizedStatus ? configMap[normalizedStatus] : undefined;

  return (
    <Tag
      color={config?.color ?? "default"}
      className={cn("mr-0 rounded-full border px-3 py-1 text-xs font-semibold", config?.className)}
    >
      {config?.label ?? status ?? "Chưa gửi"}
    </Tag>
  );
};

const InvitationTicketsPage = () => {
  const { message } = useAntdApp();

  const navigate = useNavigate();
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filterValues, setFilterValues] = useState<ValuesProps>({
    dateRange: [dayjs().startOf("day").toISOString(), dayjs().endOf("day").toISOString()]
  });
  const [dialogPrintOpen, setDialogPrintOpen] = useState(false);
  const [dialogViewDetailOpen, setDialogViewDetailOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OrderDetailProps | null>(null);
  const [selectedCancelOrder, setSelectedCancelOrder] = useState<OrderDetailProps | null>(null);
  const [cancelForm] = Form.useForm<CancelOrderFormValues>();
  const { can } = usePermission();
  const canCreate = can("invitation_tickets", "create");
  const canView = can("invitation_tickets", "view");
  const canPrint = can("invitation_tickets", "print");
  const canDelete = can("invitation_tickets", "delete");
  const cancelOrder = useCancelOrder();

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
      isInvitation: true,
      orderStatusId: OrderStatus.COMPLETED,
      ...filtered
    };
  }, [current, pageSize, filterValues]);

  const { data: invitationTickets, isFetching } = useOrders(params);
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

  const handleViewShowtimes = () => {
    navigate(`/showtimes?callbackUrl=/invitation-tickets&id=create`);
  };

  const handeViewDetail = useCallback((item: OrderDetailProps) => {
    setSelectedItem(item);
    setDialogViewDetailOpen(true);
  }, []);

  const handlePrint = useCallback((item: OrderDetailProps) => {
    setSelectedItem(item);
    setDialogPrintOpen(true);
  }, []);

  const handleDialogViewDetailClose = useCallback((open: boolean) => {
    setDialogViewDetailOpen(open);
    if (!open) {
      setSelectedItem(null);
    }
  }, []);

  const handleDialogPrintClose = useCallback((open: boolean) => {
    setDialogPrintOpen(open);
    if (!open) {
      setSelectedItem(null);
    }
  }, []);

  const handleOpenCancelDialog = useCallback(
    (item: OrderDetailProps) => {
      setSelectedCancelOrder(item);
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

      cancelOrder.mutate(
        {
          planScreenId: selectedCancelOrder.planScreening.id,
          orderIds: [selectedCancelOrder.order.id],
          cancelReasonId: values.cancelReasonId
        },
        {
          onSuccess: () => {
            handleCancelDialogClose(false);
            message.success("Hủy vé mời thành công");
          },
          onError: (error: unknown) => {
            message.error(getApiErrorMessage(error, "Hủy vé mời thất bại"));
          }
        }
      );
    },
    [cancelOrder, handleCancelDialogClose, message, selectedCancelOrder]
  );

  const getActionItems = (record: OrderDetailProps) => {
    const isPrinted = !!record.order?.invitationTickets?.urlTicket;

    return [
      ...(canView ? [{ key: "1", icon: <Eye size={16} />, label: "Xem chi tiết" }] : []),
      ...(!isPrinted && canPrint
        ? [{ key: "2", icon: <Printer size={16} />, label: "Xuất vé mời" }]
        : []),
      ...(canDelete ? [{ key: "3", icon: <X size={16} />, label: "Hủy vé mời" }] : [])
    ];
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
      title: "Mã vé",
      key: "barCode",
      dataIndex: "barCode",
      sorter: (a, b) => compareText(a.order?.barCode, b.order?.barCode),
      render: (_, record) => record.order?.barCode || "",
      fixed: "left"
    },
    {
      title: "Phim",
      key: "filmName",
      dataIndex: "filmName",
      sorter: (a, b) => compareText(a.film?.filmName, b.film?.filmName),
      render: (_, record) => record.film?.filmName || ""
    },
    {
      title: "Phòng chiếu",
      key: "roomName",
      dataIndex: "roomName",
      sorter: (a, b) => compareNaturalText(a.room?.name, b.room?.name),
      render: (_, record) => record.room?.name || ""
    },
    {
      title: "Ngày chiếu",
      key: "projectDate",
      dataIndex: "projectDate",
      sorter: (a, b) => compareDate(a.planScreening?.projectDate, b.planScreening?.projectDate),
      render: (_, record) => {
        return record.planScreening?.projectDate
          ? dayjs(record.planScreening?.projectDate, "YYYY-MM-DD").format("DD/MM/YYYY")
          : "";
      }
    },
    {
      title: "Giờ chiếu",
      key: "projectTime",
      dataIndex: "projectTime",
      sorter: (a, b) => compareDate(a.planScreening?.projectTime, b.planScreening?.projectTime),
      render: (_, record) => {
        return record.planScreening?.projectTime
          ? dayjs(record.planScreening?.projectTime).format("HH:mm")
          : "";
      }
    },
    {
      title: "Số vé",
      key: "quantity",
      dataIndex: "quantity",
      sorter: (a, b) =>
        compareNumber(
          a.order?.items?.reduce((acc, cur) => acc + cur.quantity, 0) || 0,
          b.order?.items?.reduce((acc, cur) => acc + cur.quantity, 0) || 0
        ),
      render: (_, record) => {
        const tickets = record.order?.items || [];
        const totalQuantity = tickets.reduce((acc, cur) => acc + cur.quantity, 0);
        return totalQuantity;
      }
    },
    {
      title: "Vị trí ghế",
      key: "cancelChairValue",
      dataIndex: "cancelChairValue",
      width: 220,
      sorter: (a, b) => {
        const aChairs = extractSeatValues(a.order?.items).join(", ");
        const bChairs = extractSeatValues(b.order?.items).join(", ");

        return compareText(aChairs, bChairs);
      },
      render: (_, record) => {
        const chairs = extractSeatValues(record.order?.items).join(", ");

        if (!chairs) {
          return "";
        }

        return (
          <Tooltip title={chairs}>
            <div className="max-w-50 truncate">{chairs}</div>
          </Tooltip>
        );
      }
    },
    {
      title: "Người tạo",
      key: "createdBy",
      dataIndex: "order",
      sorter: (a, b) =>
        compareText(
          [a.order?.seller?.customerFirstName, a.order?.seller?.customerLastName]
            .filter(Boolean)
            .join(" "),
          [b.order?.seller?.customerFirstName, b.order?.seller?.customerLastName]
            .filter(Boolean)
            .join(" ")
        ),
      render: (order) =>
        [order?.seller?.customerFirstName, order?.seller?.customerLastName]
          .filter(Boolean)
          .join(" ")
    },
    {
      title: "Thời gian tạo",
      key: "createdAt",
      dataIndex: "createdAt",
      sorter: (a, b) => compareDate(a.order?.createdOnUtc, b.order?.createdOnUtc),
      render: (_, record) => dayjs(record.order.createdOnUtc).format("HH:mm DD/MM/YYYY")
    },
    {
      title: "Ghi chú",
      key: "note",
      dataIndex: "order",
      sorter: (a, b) => compareText(a.order?.note, b.order?.note),
      render: (order) => order?.note
    },
    {
      title: "Email người nhận",
      key: "receivedEmail",
      sorter: (a, b) =>
        compareText(
          a.order?.invitationTickets?.receivedEmail,
          b.order?.invitationTickets?.receivedEmail
        ),
      render: (_, record) => {
        return record.order?.invitationTickets?.receivedEmail || "";
      },
      align: "center"
    },
    {
      title: "Thời gian xuất vé",
      key: "createdAt",
      sorter: (a, b) =>
        compareDate(a.order?.invitationTickets?.createdAt, b.order?.invitationTickets?.createdAt),
      render: (_, record) => {
        return record.order?.invitationTickets?.createdAt
          ? dayjs(record.order.invitationTickets.createdAt).format("HH:mm DD/MM/YYYY")
          : "";
      },
      align: "center",
      fixed: "right",
      width: 150
    },
    {
      title: "Trạng thái xuất vé",
      key: "invitationTickets",
      sorter: (a, b) =>
        compareText(a.order?.invitationTickets?.status, b.order?.invitationTickets?.status),
      render: (_, record) => (
        <div className="flex justify-center">
          {renderInvitationTicketStatus(record.order?.invitationTickets?.status)}
        </div>
      ),
      align: "center",
      fixed: "right"
    },
    ...(canView || canPrint || canDelete
      ? [
          {
            title: "",
            key: "operation",
            width: 50,
            render: (_: unknown, record: OrderDetailProps) => {
              const items = getActionItems(record);

              if (!items.length) {
                return null;
              }

              return (
                <Dropdown
                  menu={{
                    items,
                    onClick: (e) => {
                      if (e.key === "1") {
                        handeViewDetail(record);
                      }
                      if (e.key === "2") {
                        handlePrint(record);
                      }
                      if (e.key === "3") {
                        handleOpenCancelDialog(record);
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
        right={
          <>
            <Filter filterValues={filterValues} onSearch={onSearch} setCurrent={setCurrent} />
            {canCreate && (
              <Button type="primary" onClick={handleViewShowtimes}>
                Xem sơ đồ vé
              </Button>
            )}
          </>
        }
      />

      <AutoHeightTable
        rowKey={(record) => record.order.id}
        dataSource={invitationTickets?.data || []}
        columns={columns}
        bordered
        size="small"
        loading={isFetching}
        pagination={{
          current,
          onChange,
          total: invitationTickets?.total || 0,
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

      {dialogPrintOpen && selectedItem && (
        <PrintInvitationTicketDialog
          open={dialogPrintOpen}
          onOpenChange={handleDialogPrintClose}
          selectedItem={selectedItem}
        />
      )}

      <Modal
        title="Xác nhận hủy vé mời"
        open={cancelDialogOpen}
        onOk={() => cancelForm.submit()}
        onCancel={() => handleCancelDialogClose(false)}
        okButtonProps={{
          loading: cancelOrder.isPending
        }}
        cancelButtonProps={{
          disabled: cancelOrder.isPending
        }}
        modalRender={(dom) => (
          <Form<CancelOrderFormValues>
            form={cancelForm}
            onFinish={handleCancelOrder}
            autoComplete="off"
            layout="vertical"
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
      </Modal>
    </div>
  );
};

export default InvitationTicketsPage;
