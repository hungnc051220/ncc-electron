import Icon, { MoreOutlined } from "@ant-design/icons";
import { cancellationReasonsApi } from "@renderer/api/cancellationReasons.api";
import { CancelContactTicketSaleDto } from "@renderer/api/contractTicketSales.api";
import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import { useCancelContractTicketSale } from "@renderer/hooks/contractTicketSales/useCancelContractTicketSale";
import { useContractTicketSales } from "@renderer/hooks/contractTicketSales/useContractTicketSales";
import { useUserDetail } from "@renderer/hooks/users/useUserDetail";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { getPrintErrorMessage } from "@renderer/lib/print";
import {
  buildTicketsFromOrder,
  filterEmptyValues,
  formatMoney,
  formatNumber,
  compareText,
  compareNumber,
  compareDate
} from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { useAuthStore } from "@renderer/store/auth.store";
import { usePrinterStore } from "@renderer/store/printer.store";
import { useSettingPosStore } from "@renderer/store/settingPos.store";
import { OrderDetailProps, OrderResponseProps } from "@shared/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { PaginationProps, TableProps } from "antd";
import { Button, Dropdown, Form, Modal, Select, Table, Tooltip } from "antd";
import dayjs from "dayjs";
import {
  Armchair,
  FileSpreadsheet,
  FileText,
  PlusIcon,
  Printer,
  SquarePen,
  Trash2
} from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import InvoiceDialog from "../invoices/components/InvoiceDialog";
import { exportContractTicketSaleExcel } from "./components/exportContractTicketSaleExcel";
import ContractTicketSaleDialog from "./components/ContractTicketSaleDialog";
import Filter from "./components/Filter";
import { useSummaryContractTicketSales } from "@renderer/hooks/contractTicketSales/useSummaryContractTicketSales";
import { useAntdApp } from "@renderer/hooks/useAntdApp";

export interface ValuesProps {
  dateRange?: [string, string];
}

type PlanDetail = OrderDetailProps["planDetails"][number];

interface ContractTicketSaleRow {
  key: string;
  orderDetail: OrderDetailProps;
  planDetail: PlanDetail;
  rowSpan: number;
  isFirstRow: boolean;
  contractIndex: number;
}

type DeleteContractFormValues = {
  cancelReasonId: number;
};

const ContractTicketSalesPage = () => {
  const { message } = useAntdApp();

  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.userId);
  const { posShortName } = useSettingPosStore();
  const selectedPrinter = usePrinterStore((s) => s.selectedPrinter);
  const { data: user } = useUserDetail(userId!);
  const { can } = usePermission();
  const canCreate = can("contract_ticket_sales", "create");
  const canUpdate = can("contract_ticket_sales", "update");
  const canView = can("contract_ticket_sales", "view");
  const canPrint = can("contract_ticket_sales", "print");
  const canDelete = can("contract_ticket_sales", "delete");

  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [deleteForm] = Form.useForm<DeleteContractFormValues>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogInvoiceOpen, setDialogInvoiceOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OrderResponseProps | null>(null);
  const [selectedDeleteItem, setSelectedDeleteItem] = useState<OrderDetailProps | null>(null);
  const [filterValues, setFilterValues] = useState<ValuesProps>({
    dateRange: [dayjs().format("YYYY-MM-DD"), dayjs().format("YYYY-MM-DD")]
  });
  const cancelContractTicketSale = useCancelContractTicketSale();

  const params = useMemo(() => {
    const { dateRange, ...rest } = filterValues;
    const filtered = filterEmptyValues(rest as Record<string, unknown>);

    if (dateRange && dateRange.length === 2) {
      filtered.fromDate = dayjs(dateRange[0]).startOf("day").format("YYYY-MM-DD");
      filtered.toDate = dayjs(dateRange[1]).endOf("day").format("YYYY-MM-DD");
    }

    return {
      current,
      pageSize,
      ...filtered
    };
  }, [current, pageSize, filterValues]);

  const { data: tickets, isFetching } = useContractTicketSales(params);
  const { data: summary } = useSummaryContractTicketSales(params);
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

  const handleAdd = useCallback(() => {
    setSelectedItem(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((item: OrderResponseProps) => {
    setSelectedItem(item);
    setDialogOpen(true);
  }, []);

  const handleDetailInvoice = useCallback((item: OrderResponseProps) => {
    setSelectedItem(item);
    setDialogInvoiceOpen(true);
  }, []);

  const handleOpenDelete = useCallback((item: OrderDetailProps) => {
    setSelectedDeleteItem(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleUpdateSeat = (item: OrderResponseProps) => {
    navigate(`/showtimes?callbackUrl=/contract-ticket-sales&id=${item.id}`);
  };

  const handlePrint = useCallback(
    async (item: OrderDetailProps) => {
      const messageKey = `print-contract-ticket-${item.order?.id ?? "unknown"}`;

      message.loading({
        content: "Đang in vé, vui lòng chờ...",
        key: messageKey,
        duration: 0
      });

      try {
        const tickets = await buildTicketsFromOrder(item, user?.fullname, posShortName);
        await window.api.printTickets(tickets, selectedPrinter);
        message.success({
          content: "In vé thành công",
          key: messageKey
        });
      } catch (error) {
        message.error({
          content: getPrintErrorMessage(error),
          key: messageKey,
          duration: 4
        });
      }
    },
    [message, posShortName, selectedPrinter, user]
  );

  const handleExportExcel = useCallback(
    async (item: OrderDetailProps) => {
      const messageKey = `export-contract-ticket-sale-${item.order.id}`;

      message.open({
        key: messageKey,
        type: "loading",
        content: "Đang xuất file excel...",
        duration: 0
      });

      try {
        const result = await exportContractTicketSaleExcel(item);

        if (result.canceled) {
          message.open({
            key: messageKey,
            type: "warning",
            content: "Bạn đã hủy lưu file excel"
          });
          return;
        }

        message.open({
          key: messageKey,
          type: "success",
          content: "Xuất file excel thành công"
        });
      } catch (error) {
        message.open({
          key: messageKey,
          type: "error",
          content: getApiErrorMessage(error, "Xuất excel thất bại")
        });
      }
    },
    [message]
  );

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedItem(null);
    }
  }, []);

  const handleDialogInvoiceClose = useCallback((open: boolean) => {
    setDialogInvoiceOpen(open);
    if (!open) {
      setSelectedItem(null);
    }
  }, []);

  const handleDeleteDialogClose = useCallback(
    (open: boolean) => {
      setDeleteDialogOpen(open);
      if (!open) {
        setSelectedDeleteItem(null);
        deleteForm.resetFields();
      }
    },
    [deleteForm]
  );

  const getPlanDetails = useCallback(
    (record: OrderDetailProps): PlanDetail[] =>
      record.planDetails?.length
        ? record.planDetails
        : record.planScreening || record.film || record.room
          ? [record]
          : [],
    []
  );

  const getDisplayPlans = useCallback(
    (record: OrderDetailProps) =>
      Array.from(
        new Map(
          getPlanDetails(record).map((item) => {
            const filmName = item.film?.filmName || "";
            const roomName = item.room?.name || "";
            const projectDate = item.planScreening?.projectDate || "";
            const projectTime = item.planScreening?.projectTime || "";
            const schedule = [projectDate, projectTime].filter(Boolean).join("|");

            return [`${filmName}-${roomName}-${schedule}`, item];
          })
        ).values()
      ),
    [getPlanDetails]
  );

  const getTicketCountByPlan = useCallback(
    (record: OrderDetailProps, planScreeningId?: number | null) => {
      if (!planScreeningId) {
        return 0;
      }

      return (
        record.order?.items?.reduce(
          (acc, item) => (item.planScreenId === planScreeningId ? acc + item.quantity : acc),
          0
        ) || 0
      );
    },
    []
  );

  const getTotalTicketCount = useCallback(
    (record: OrderDetailProps) =>
      record.order?.items?.reduce((acc, cur) => acc + cur.quantity, 0) || 0,
    []
  );

  const getSeatsByPlan = useCallback(
    (record: OrderDetailProps, planScreeningId?: number | null) => {
      if (!planScreeningId) {
        return "";
      }

      const seats =
        record.order?.items?.flatMap((item) => {
          if (item.planScreenId !== planScreeningId) {
            return [];
          }

          return [item.listChairValueF1, item.listChairValueF2, item.listChairValueF3]
            .flatMap((value) => value?.split(",") ?? [])
            .map((seat) => seat.trim())
            .filter(Boolean);
        }) ?? [];

      return seats.join(", ");
    },
    []
  );

  const flattenedRows = useMemo<ContractTicketSaleRow[]>(
    () =>
      (tickets?.data || []).flatMap((record, recordIndex) => {
        const plans = getDisplayPlans(record);
        const rowSpan = Math.max(plans.length, 1);
        const fallbackPlan = plans[0] ?? record;

        return (plans.length ? plans : [fallbackPlan]).map((planDetail, planIndex) => ({
          key: `${record.order.id}-${planDetail.planScreening?.id ?? "unknown"}-${planIndex}`,
          orderDetail: record,
          planDetail,
          rowSpan,
          isFirstRow: planIndex === 0,
          contractIndex: (current - 1) * pageSize + recordIndex + 1
        }));
      }),
    [current, getDisplayPlans, pageSize, tickets?.data]
  );

  const isEmptyContract = useCallback(
    (record: OrderDetailProps) => {
      const hasPlanScreening = getDisplayPlans(record).some((item) =>
        Boolean(item.planScreening?.id)
      );
      return !hasPlanScreening && getTotalTicketCount(record) === 0;
    },
    [getDisplayPlans, getTotalTicketCount]
  );

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

  const handleDeleteContract = useCallback(
    (values: DeleteContractFormValues) => {
      if (!selectedDeleteItem?.order?.id) {
        return;
      }

      const cancelReasonMsg =
        cancelReasonOptions
          .find((item) => item.value === values.cancelReasonId)
          ?.label?.toString() ?? "";

      const payload: CancelContactTicketSaleDto = {
        orderId: selectedDeleteItem.order.id,
        cancelReasonId: values.cancelReasonId,
        cancelReasonMsg
      };

      cancelContractTicketSale.mutate(payload, {
        onSuccess: () => {
          handleDeleteDialogClose(false);
          message.success("Xóa hợp đồng thành công");
        },
        onError: (error: unknown) => {
          message.error(getApiErrorMessage(error, "Xóa hợp đồng thất bại"));
        }
      });
    },
    [
      cancelContractTicketSale,
      cancelReasonOptions,
      handleDeleteDialogClose,
      message,
      selectedDeleteItem
    ]
  );

  const getActionItems = useCallback(
    (record: OrderDetailProps) => {
      const emptyContract = isEmptyContract(record);

      return [
        ...(canUpdate
          ? [
              { key: "1", icon: <SquarePen size={16} />, label: "Cập nhật" },
              { key: "2", icon: <Armchair size={16} />, label: "Thiết lập ghế ngồi" }
            ]
          : []),
        ...(canPrint && !emptyContract
          ? [{ key: "3", icon: <Printer size={16} />, label: "In vé" }]
          : []),
        ...(canView && !emptyContract
          ? [{ key: "4", icon: <FileText size={16} />, label: "Thông tin xuất hóa đơn" }]
          : []),
        ...(!emptyContract
          ? [{ key: "6", icon: <FileSpreadsheet size={16} />, label: "Xuất Excel" }]
          : []),
        ...(canDelete && emptyContract
          ? [{ key: "5", icon: <Trash2 size={16} />, label: "Xóa", danger: true }]
          : [])
      ];
    },
    [canDelete, canPrint, canUpdate, canView, isEmptyContract]
  );

  const renderPlanSchedule = useCallback((item: PlanDetail) => {
    const filmName = item.film?.filmName || "Không có tên phim";
    const roomName = item.room?.name ? `Phòng ${item.room.name}` : "";
    const projectDate = item.planScreening?.projectDate;
    const projectTime = item.planScreening?.projectTime;
    const schedule = [
      projectDate ? dayjs(projectDate, "YYYY-MM-DD").format("DD/MM/YYYY") : "",
      projectTime ? dayjs(projectTime).format("HH:mm") : ""
    ]
      .filter(Boolean)
      .join(" - ");

    return (
      <div className="leading-5">
        <div className="font-medium">{filmName}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {[roomName, schedule].filter(Boolean).join(" | ") || "Chưa có lịch chiếu"}
        </div>
      </div>
    );
  }, []);

  const renderMergedCell = useCallback(
    (isFirstRow: boolean, rowSpan: number, children: ReactNode) => ({
      children,
      props: {
        rowSpan: isFirstRow ? rowSpan : 0
      }
    }),
    []
  );

  const columns: TableProps<ContractTicketSaleRow>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, record) =>
        renderMergedCell(record.isFirstRow, record.rowSpan, record.contractIndex),
      width: 50,
      fixed: "left"
    },
    {
      title: "Tên khách hàng",
      key: "customerFirstName",
      dataIndex: "customerFirstName",
      sorter: (a, b) =>
        compareText(a.orderDetail.order?.customerFirstName, b.orderDetail.order?.customerFirstName),
      render: (_, record) =>
        renderMergedCell(
          record.isFirstRow,
          record.rowSpan,
          record.orderDetail.order?.customerFirstName
        )
    },
    {
      title: "Suất chiếu",
      key: "scheduleSummary",
      width: 360,
      sorter: (a, b) =>
        compareText(
          [
            a.planDetail.film?.filmName || "",
            a.planDetail.room?.name || "",
            a.planDetail.planScreening?.projectDate || "",
            a.planDetail.planScreening?.projectTime || ""
          ].join(" | "),
          [
            b.planDetail.film?.filmName || "",
            b.planDetail.room?.name || "",
            b.planDetail.planScreening?.projectDate || "",
            b.planDetail.planScreening?.projectTime || ""
          ].join(" | ")
        ),
      render: (_, record) => renderPlanSchedule(record.planDetail)
    },
    {
      title: "Số vé",
      key: "ticketCountByScreening",
      width: 120,
      sorter: (a, b) =>
        compareNumber(
          getTicketCountByPlan(a.orderDetail, a.planDetail.planScreening?.id),
          getTicketCountByPlan(b.orderDetail, b.planDetail.planScreening?.id)
        ),
      render: (_, record) =>
        formatNumber(getTicketCountByPlan(record.orderDetail, record.planDetail.planScreening?.id)),
      align: "right"
    },
    {
      title: "Vị trí ghế",
      key: "seatPositions",
      width: 220,
      sorter: (a, b) =>
        compareText(
          getSeatsByPlan(a.orderDetail, a.planDetail.planScreening?.id),
          getSeatsByPlan(b.orderDetail, b.planDetail.planScreening?.id)
        ),
      render: (_, record) => {
        const seats = getSeatsByPlan(record.orderDetail, record.planDetail.planScreening?.id);

        if (!seats) {
          return "";
        }

        return (
          <Tooltip title={seats}>
            <div className="max-w-50 truncate">{seats}</div>
          </Tooltip>
        );
      }
    },
    {
      title: "Tổng số vé",
      key: "ticketCount",
      dataIndex: "ticketCount",
      sorter: (a, b) =>
        compareNumber(getTotalTicketCount(a.orderDetail), getTotalTicketCount(b.orderDetail)),
      render: (_, record) =>
        renderMergedCell(
          record.isFirstRow,
          record.rowSpan,
          getTotalTicketCount(record.orderDetail)
        ),
      align: "right"
    },
    {
      title: "Giá trị hợp đồng",
      key: "orderTotal",
      dataIndex: "orderTotal",
      sorter: (a, b) =>
        compareNumber(a.orderDetail.order?.orderTotal, b.orderDetail.order?.orderTotal),
      render: (_, record) =>
        renderMergedCell(
          record.isFirstRow,
          record.rowSpan,
          formatMoney(record.orderDetail.order?.orderTotal || 0)
        ),
      align: "right"
    },
    {
      title: "Ghi chú",
      key: "note",
      sorter: (a, b) => compareText(a.orderDetail.order?.note, b.orderDetail.order?.note),
      render: (_, record) =>
        renderMergedCell(record.isFirstRow, record.rowSpan, record.orderDetail.order?.note)
    },
    {
      title: "Thời gian tạo",
      key: "createdOnUtc",
      dataIndex: "createdOnUtc",
      sorter: (a, b) =>
        compareDate(a.orderDetail.order?.createdOnUtc, b.orderDetail.order?.createdOnUtc),
      render: (_, record) =>
        renderMergedCell(
          record.isFirstRow,
          record.rowSpan,
          record.orderDetail.order?.createdOnUtc
            ? dayjs(record.orderDetail.order.createdOnUtc).format("HH:mm DD/MM/YYYY")
            : ""
        ),
      width: 150
    },
    ...(canUpdate || canPrint || canView || canDelete
      ? [
          {
            title: "",
            key: "operation",
            width: 50,
            render: (_: unknown, record: ContractTicketSaleRow) => {
              const items = getActionItems(record.orderDetail);

              return renderMergedCell(
                record.isFirstRow,
                record.rowSpan,
                items.length ? (
                  <Dropdown
                    menu={{
                      items,
                      onClick: (e) => {
                        if (e.key === "1") {
                          handleEdit(record.orderDetail.order);
                        }
                        if (e.key === "2") {
                          handleUpdateSeat(record.orderDetail.order);
                        }
                        if (e.key === "3") {
                          handlePrint(record.orderDetail);
                        }
                        if (e.key === "4") {
                          handleDetailInvoice(record.orderDetail.order);
                        }
                        if (e.key === "5") {
                          handleOpenDelete(record.orderDetail);
                        }
                        if (e.key === "6") {
                          void handleExportExcel(record.orderDetail);
                        }
                      }
                    }}
                    arrow
                    trigger={["click"]}
                  >
                    <MoreOutlined />
                  </Dropdown>
                ) : null
              );
            },
            align: "center" as const,
            fixed: "right" as const
          }
        ]
      : [])
  ];

  const onChange = (page: number) => {
    setCurrent(page);
  };

  const onShowSizeChange: PaginationProps["onShowSizeChange"] = (current, pageSize) => {
    setCurrent(current);
    setPageSize(pageSize);
  };

  const onSearch = (values: ValuesProps) => {
    setFilterValues(values);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-4 pt-4">
      <PageHeader
        left={<AppBreadcrumb />}
        right={
          <>
            <Filter filterValues={filterValues} setCurrent={setCurrent} onSearch={onSearch} />
            {canCreate && (
              <Button type="primary" onClick={handleAdd} icon={<Icon component={PlusIcon} />}>
                Thêm hợp đồng
              </Button>
            )}
          </>
        }
      />

      <AutoHeightTable
        rowKey={(record) => record.key}
        dataSource={flattenedRows}
        columns={columns}
        bordered
        size="small"
        loading={isFetching}
        pagination={{
          current,
          onChange,
          total: tickets?.total || 0,
          size: "middle",
          pageSize,
          pageSizeOptions: [20, 50, 100],
          showSizeChanger: true,
          onShowSizeChange,
          showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`
        }}
        summary={() => {
          return summary && summary.ordersCount ? (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} align="center" className="font-bold">
                  Tổng
                </Table.Summary.Cell>
                <Table.Summary.Cell align="right" index={1} className="font-bold">
                  {formatNumber(summary?.ordersCount ?? 0)}
                </Table.Summary.Cell>
                <Table.Summary.Cell align="right" index={2} className="font-bold">
                  {formatNumber(summary?.plansCount ?? 0)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3}></Table.Summary.Cell>
                <Table.Summary.Cell index={4}></Table.Summary.Cell>
                <Table.Summary.Cell align="right" index={5} className="font-bold">
                  {formatNumber(summary?.itemsCount ?? 0)}
                </Table.Summary.Cell>
                <Table.Summary.Cell align="right" index={6} className="font-bold">
                  {formatMoney(summary?.ordersTotal ?? 0)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7}></Table.Summary.Cell>
                <Table.Summary.Cell index={8}></Table.Summary.Cell>
                <Table.Summary.Cell index={9}></Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          ) : null;
        }}
      />

      {dialogOpen && (
        <ContractTicketSaleDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          selectedItem={selectedItem}
        />
      )}

      {dialogInvoiceOpen && (
        <InvoiceDialog
          open={dialogInvoiceOpen}
          onOpenChange={handleDialogInvoiceClose}
          orderId={selectedItem?.id}
        />
      )}

      <Modal
        title="Xác nhận xóa hợp đồng"
        open={deleteDialogOpen}
        onOk={() => deleteForm.submit()}
        onCancel={() => handleDeleteDialogClose(false)}
        okText="Xóa"
        okButtonProps={{
          danger: true,
          loading: cancelContractTicketSale.isPending
        }}
        cancelButtonProps={{
          disabled: cancelContractTicketSale.isPending
        }}
        forceRender
        modalRender={(dom) => (
          <Form<DeleteContractFormValues>
            form={deleteForm}
            onFinish={handleDeleteContract}
            autoComplete="off"
            layout="vertical"
          >
            {dom}
          </Form>
        )}
      >
        <Form.Item<DeleteContractFormValues>
          name="cancelReasonId"
          label="Lý do xóa hợp đồng"
          rules={[{ required: true, message: "Chọn lý do xóa hợp đồng" }]}
        >
          <Select
            loading={isFetchingCancellationReasons || isFetchingNextPage}
            options={cancelReasonOptions}
            placeholder="Chọn lý do xóa hợp đồng"
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

export default ContractTicketSalesPage;
