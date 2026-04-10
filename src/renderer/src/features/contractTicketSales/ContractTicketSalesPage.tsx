import Icon, { MoreOutlined } from "@ant-design/icons";
import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import { useContractTicketSales } from "@renderer/hooks/contractTicketSales/useContractTicketSales";
import { getPrintErrorMessage } from "@renderer/lib/print";
import {
  buildTicketsFromOrder,
  filterEmptyValues,
  formatMoney,
  formatNumber
} from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { OrderDetailProps, OrderResponseProps } from "@shared/types";
import type { PaginationProps, TableProps } from "antd";
import { Button, Dropdown, message } from "antd";
import dayjs from "dayjs";
import { Armchair, FileText, PlusIcon, Printer, SquarePen } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import ContractTicketSaleDialog from "./components/ContractTicketSaleDialog";
import Filter from "./components/Filter";
import InvoiceDialog from "../invoices/components/InvoiceDialog";
import { useAuthStore } from "@renderer/store/auth.store";
import { useSettingPosStore } from "@renderer/store/settingPos.store";
import { usePrinterStore } from "@renderer/store/printer.store";
import { useUserDetail } from "@renderer/hooks/users/useUserDetail";

export interface ValuesProps {
  dateRange?: [string, string];
}

type PlanDetail = OrderDetailProps["planDetails"][number];

const compareText = (left?: string | null, right?: string | null) =>
  (left || "").localeCompare(right || "", "vi", { sensitivity: "base" });

const compareNumber = (left?: number | null, right?: number | null) => (left || 0) - (right || 0);

const compareDate = (left?: string | null, right?: string | null) =>
  dayjs(left).valueOf() - dayjs(right).valueOf();

interface ContractTicketSaleRow {
  key: string;
  orderDetail: OrderDetailProps;
  planDetail: PlanDetail;
  rowSpan: number;
  isFirstRow: boolean;
  contractIndex: number;
}

const ContractTicketSalesPage = () => {
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

  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogInvoiceOpen, setDialogInvoiceOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OrderResponseProps | null>(null);
  const [filterValues, setFilterValues] = useState<ValuesProps>({
    dateRange: [dayjs().format("YYYY-MM-DD"), dayjs().format("YYYY-MM-DD")]
  });

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
    [posShortName, selectedPrinter, user]
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

  const actionItems = [
    ...(canUpdate
      ? [
          { key: "1", icon: <SquarePen size={16} />, label: "Cập nhật" },
          { key: "2", icon: <Armchair size={16} />, label: "Thiết lập ghế ngồi" }
        ]
      : []),
    ...(canPrint ? [{ key: "3", icon: <Printer size={16} />, label: "In vé" }] : []),
    ...(canView
      ? [{ key: "4", icon: <FileText size={16} />, label: "Thông tin xuất hóa đơn" }]
      : [])
  ];

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
      title: "Tổng số vé",
      key: "ticketCount",
      dataIndex: "ticketCount",
      sorter: (a, b) =>
        compareNumber(
          a.orderDetail.order?.items?.reduce((acc, cur) => acc + cur.quantity, 0),
          b.orderDetail.order?.items?.reduce((acc, cur) => acc + cur.quantity, 0)
        ),
      render: (_, record) =>
        renderMergedCell(
          record.isFirstRow,
          record.rowSpan,
          record.orderDetail.order?.items?.reduce((acc, cur) => acc + cur.quantity, 0)
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
    ...(actionItems.length
      ? [
          {
            title: "",
            key: "operation",
            width: 50,
            render: (_: unknown, record: ContractTicketSaleRow) =>
              renderMergedCell(
                record.isFirstRow,
                record.rowSpan,
                <Dropdown
                  menu={{
                    items: actionItems,
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
    </div>
  );
};

export default ContractTicketSalesPage;
