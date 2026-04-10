"use client";

import { cancellationReasonsApi } from "@renderer/api/cancellationReasons.api";
import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import { MoreOutlined } from "@ant-design/icons";
import { useCancelOrder } from "@renderer/hooks/orders/useCancelOrder";
import { useOrders } from "@renderer/hooks/orders/useOrders";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { filterEmptyValues, formatNumber } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { OrderDetailProps, OrderStatus } from "@shared/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { PaginationProps, TableProps } from "antd";
import { Button, Dropdown, Form, Modal, Select, message } from "antd";
import dayjs from "dayjs";
import { Check, Eye, Printer, X } from "lucide-react";
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

const InvitationTicketsPage = () => {
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
            message.success("Huỷ vé mời thành công");
          },
          onError: (error: unknown) => {
            message.error(getApiErrorMessage(error, "Huỷ vé mời thất bại"));
          }
        }
      );
    },
    [cancelOrder, handleCancelDialogClose, selectedCancelOrder]
  );

  const actionItems = [
    ...(canView ? [{ key: "1", icon: <Eye size={16} />, label: "Xem chi tiết" }] : []),
    ...(canPrint ? [{ key: "2", icon: <Printer size={16} />, label: "Xuất vé mời" }] : []),
    ...(canDelete ? [{ key: "3", icon: <X size={16} />, label: "Hủy vé mời" }] : [])
  ];

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
      sorter: (a, b) => {
        const aChairs = [
          ...(a.order?.items?.map((item) => item.listChairValueF1) || []),
          ...(a.order?.items?.map((item) => item.listChairValueF2) || []),
          ...(a.order?.items?.map((item) => item.listChairValueF3) || [])
        ]
          .filter(Boolean)
          .join(", ");
        const bChairs = [
          ...(b.order?.items?.map((item) => item.listChairValueF1) || []),
          ...(b.order?.items?.map((item) => item.listChairValueF2) || []),
          ...(b.order?.items?.map((item) => item.listChairValueF3) || [])
        ]
          .filter(Boolean)
          .join(", ");

        return compareText(aChairs, bChairs);
      },
      render: (_, record) => {
        const chairsF1 = record.order?.items?.map((item) => item.listChairValueF1);
        const chairsF2 = record.order?.items?.map((item) => item.listChairValueF2);
        const chairsF3 = record.order?.items?.map((item) => item.listChairValueF3);
        const allChairs = [...chairsF1, ...chairsF2, ...chairsF3].filter(Boolean);
        return allChairs.join(", ");
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
      title: "Xuất vé mời qua email",
      key: "invitationTickets",
      sorter: (a, b) =>
        compareText(a.order?.invitationTickets?.status, b.order?.invitationTickets?.status),
      render: (_, record) => {
        return (
          <div className="flex justify-center">
            {record.order?.invitationTickets?.status === "sent" ? (
              <Check className="size-4 text-green-500" />
            ) : (
              <X className="size-4 text-red-500" />
            )}
          </div>
        );
      },
      align: "center",
      fixed: "right"
    },
    ...(actionItems.length
      ? [
          {
            title: "",
            key: "operation",
            width: 50,
            render: (_: unknown, record: OrderDetailProps) => (
              <Dropdown
                menu={{
                  items: actionItems,
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
