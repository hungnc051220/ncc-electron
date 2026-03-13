import Icon, { MoreOutlined } from "@ant-design/icons";
import { useContractTicketSales } from "@renderer/hooks/contractTicketSales/useContractTicketSales";
import {
  buildTicketsFromOrder,
  filterEmptyValues,
  formatMoney,
  formatNumber
} from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { OrderDetailProps, OrderResponseProps } from "@shared/types";
import type { PaginationProps, TableProps } from "antd";
import { Breadcrumb, Button, Dropdown, message, Table } from "antd";
import dayjs from "dayjs";
import { PlusIcon } from "lucide-react";
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
      try {
        const tickets = await buildTicketsFromOrder(item, user?.fullname, posShortName);
        await window.api.printTickets(tickets, selectedPrinter);
        message.success("In vé thành công");
      } catch {
        message.error("In vé thất bại");
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
          { key: "1", label: "Cập nhật" },
          { key: "2", label: "Thiết lập ghế ngồi" }
        ]
      : []),
    ...(canPrint ? [{ key: "3", label: "In vé" }] : []),
    ...(canView ? [{ key: "4", label: "Thông tin xuất hóa đơn" }] : [])
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
      title: "Tên khách hàng",
      key: "customerFirstName",
      dataIndex: "customerFirstName",
      render: (_, record) => record.order?.customerFirstName
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
      dataIndex: "roomName",
      render: (_, record) => record.room?.name,
      width: 120
    },
    {
      title: "Ngày chiếu",
      key: "projectDate",
      dataIndex: "projectDate",
      render: (_, record) =>
        record.planScreening?.projectDate
          ? dayjs(record.planScreening.projectDate, "YYYY-MM-DD").utc().format("DD/MM/YYYY")
          : "",
      width: 100
    },
    {
      title: "Giờ chiếu",
      key: "projectTime",
      dataIndex: "projectTime",
      render: (_, record) =>
        record.planScreening?.projectTime
          ? dayjs(record.planScreening.projectTime).utc().format("HH:mm")
          : "",
      width: 100
    },
    {
      title: "Số vé",
      key: "ticketCount",
      dataIndex: "ticketCount",
      render: (_, record) => record.order?.items?.reduce((acc, cur) => acc + cur.quantity, 0),
      align: "right"
    },
    {
      title: "Giá trị hợp đồng",
      key: "orderTotal",
      dataIndex: "orderTotal",
      render: (_, record) => formatMoney(record.order?.orderTotal || 0),
      align: "right"
    },
    {
      title: "Ngày tạo",
      key: "createdOnUtc",
      dataIndex: "createdOnUtc",
      render: (_, record) =>
        record.order?.createdOnUtc
          ? dayjs(record.order.createdOnUtc).utc().format("DD/MM/YYYY")
          : "",
      width: 100
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
                      handleEdit(record.order);
                    }
                    if (e.key === "2") {
                      handleUpdateSeat(record.order);
                    }
                    if (e.key === "3") {
                      handlePrint(record);
                    }
                    if (e.key === "4") {
                      handleDetailInvoice(record.order);
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
    <div className="space-y-3 mt-4 px-4">
      <div className="flex items-center justify-between">
        <Breadcrumb
          items={[
            {
              title: "Trang chủ",
              href: "/"
            },
            {
              title: "Bán vé"
            },
            {
              title: "Danh sách vé bán hợp đồng"
            }
          ]}
        />

        <div className="flex gap-2 items-center">
          <Filter filterValues={filterValues} setCurrent={setCurrent} onSearch={onSearch} />
          {canCreate && (
            <Button type="primary" onClick={handleAdd} icon={<Icon component={PlusIcon} />}>
              Thêm hợp đồng
            </Button>
          )}
        </div>
      </div>

      <Table
        rowKey={(record) => record.order.id}
        dataSource={tickets?.data || []}
        columns={columns}
        bordered
        size="small"
        scroll={{ x: "max-content", y: "calc(100vh - 265px)" }}
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
