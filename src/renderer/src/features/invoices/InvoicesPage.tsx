import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import RefreshButton from "@renderer/components/RefreshButton";
import Icon, { MoreOutlined } from "@ant-design/icons";
import { useInvoices } from "@renderer/hooks/invoices/useInvoices";
import { useAntdApp } from "@renderer/hooks/useAntdApp";
import {
  formatNumber,
  compareText,
  compareDate,
  compareNumber,
  formatMoney
} from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { InvoiceProps, InvoiceStatus } from "@shared/types";
import type { PaginationProps, TableProps } from "antd";
import { Button, Dropdown } from "antd";
import { DownloadIcon, Eye, RefreshCcw, SquarePen } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import InvoiceDialog from "./components/InvoiceDialog";
import { InvoiceStatusBadge } from "./components/InvoiceStatusBadge";
import UpdateStatusInvoiceDialog from "./components/UpdateStatusInvoiceDialog";
import dayjs from "dayjs";
import OrderDetailDialog from "../orderHistory/components/OrderDetailDialog";
import { exportInvoicesExcel, fetchAllInvoicesForExport } from "./components/exportInvoicesExcel";

const InvoicesPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogUpdateStatusOpen, setDialogUpdateStatusOpen] = useState(false);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedItem, setSelectedItem] = useState<InvoiceProps | null>(null);
  const [dialogViewOrderDetailOpen, setDialogViewOrderDetailOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const { message } = useAntdApp();

  const params = useMemo(
    () => ({
      current,
      pageSize
    }),
    [current, pageSize]
  );

  const { data: invoices, isFetching, refetch } = useInvoices(params);
  const { can } = usePermission();
  const canView = can("invoices", "view");
  const canUpdate = can("invoices", "update");

  const handleViewOrderDetail = useCallback((item: InvoiceProps) => {
    if (!item.order?.id) {
      return;
    }

    setSelectedOrderId(item.order.id);
    setDialogViewOrderDetailOpen(true);
  }, []);

  const handleEdit = useCallback((item: InvoiceProps) => {
    setSelectedItem(item);
    setDialogOpen(true);
  }, []);

  const handleUpdateStatus = useCallback((item: InvoiceProps) => {
    setSelectedItem(item);
    setDialogUpdateStatusOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedItem(null);
    }
  }, []);

  const handleDialogUpdateStatusClose = useCallback((open: boolean) => {
    setDialogUpdateStatusOpen(open);
    if (!open) {
      setSelectedItem(null);
    }
  }, []);

  const handleDialogViewOrderDetailClose = useCallback((open: boolean) => {
    setDialogViewOrderDetailOpen(open);
    if (!open) {
      setSelectedOrderId(null);
    }
  }, []);

  const handleExportExcel = useCallback(async () => {
    const messageKey = "export-invoices";
    setIsExporting(true);
    message.open({
      key: messageKey,
      type: "loading",
      content: "Đang xuất file Excel...",
      duration: 0
    });

    try {
      const allInvoices = await fetchAllInvoicesForExport();

      if (allInvoices.length === 0) {
        message.open({
          key: messageKey,
          type: "warning",
          content: "Không có dữ liệu để xuất Excel"
        });
        return;
      }

      const result = await exportInvoicesExcel(allInvoices);
      message.open({
        key: messageKey,
        type: result.canceled ? "warning" : "success",
        content: result.canceled ? "Bạn đã hủy lưu file Excel" : "Xuất file Excel thành công"
      });
    } catch (error) {
      message.open({
        key: messageKey,
        type: "error",
        content: error instanceof Error ? error.message : "Xuất file Excel thất bại"
      });
    } finally {
      setIsExporting(false);
    }
  }, [message]);

  const actionItems = [
    ...(canView
      ? [{ key: "view-order-detail", icon: <Eye size={16} />, label: "Xem chi tiết đơn" }]
      : []),
    ...(canUpdate
      ? [
          { key: "edit", icon: <SquarePen size={16} />, label: "Cập nhật" },
          { key: "update-status", icon: <RefreshCcw size={16} />, label: "Thay đổi trạng thái" }
        ]
      : [])
  ];

  const columns: TableProps<InvoiceProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
      width: 50,
      fixed: "left"
    },
    {
      title: "Thời gian tạo",
      key: "createdAt",
      dataIndex: "createdAt",
      sorter: (a, b) => compareDate(a.createdAt, b.createdAt),
      render: (value: string) => dayjs(value).format("HH:mm DD/MM/YYYY")
    },
    {
      title: "Tổng số tiền",
      key: "orderTotal",
      dataIndex: "order",
      sorter: (a, b) => compareNumber(a.order?.orderTotal, b.order?.orderTotal),
      render: (order) => formatMoney(order?.orderTotal),
      align: "right"
    },
    {
      title: "Mã số thuế",
      key: "taxCode",
      dataIndex: "taxCode",
      sorter: (a, b) => compareText(a.taxCode, b.taxCode)
    },
    {
      title: "Tên người mua/đơn vị",
      key: "partyA",
      dataIndex: "partyA",
      sorter: (a, b) => compareText(a.partyA, b.partyA)
    },
    {
      title: "Email",
      key: "email",
      dataIndex: "email",
      sorter: (a, b) => compareText(a.email, b.email)
    },
    {
      title: "Loại hóa đơn",
      key: "invoiceType",
      dataIndex: "invoiceType",
      sorter: (a, b) =>
        compareText(
          a.invoiceType === "personal" ? "Cá nhân" : "Đơn vị",
          b.invoiceType === "personal" ? "Cá nhân" : "Đơn vị"
        ),
      render: (value: string) => (value === "personal" ? "Cá nhân" : "Đơn vị")
    },
    {
      title: "Mã vé",
      key: "barCode",
      dataIndex: "order",
      sorter: (a, b) => compareText(a.order?.barCode, b.order?.barCode),
      render: (order) => order?.barCode
    },

    {
      title: "Địa chỉ",
      key: "address",
      dataIndex: "address",
      sorter: (a, b) => compareText(a.address, b.address),
      width: 300
    },

    {
      title: "Số điện thoại",
      key: "phoneNumber",
      dataIndex: "phoneNumber",
      sorter: (a, b) => compareText(a.phoneNumber, b.phoneNumber)
    },

    {
      title: "Căn cước công dân",
      key: "citizenId",
      dataIndex: "citizenId",
      sorter: (a, b) => compareText(a.citizenId, b.citizenId)
    },
    {
      title: "Đại diện",
      key: "representative",
      dataIndex: "representative",
      sorter: (a, b) => compareText(a.representative, b.representative)
    },
    {
      title: "Chức vụ",
      key: "position",
      dataIndex: "position",
      sorter: (a, b) => compareText(a.position, b.position)
    },
    {
      title: "Hợp đồng số",
      key: "contractCode",
      dataIndex: "contractCode",
      sorter: (a, b) => compareText(a.contractCode, b.contractCode)
    },
    {
      title: "Ghi chú",
      key: "note",
      dataIndex: "note",
      sorter: (a, b) => compareText(a.note, b.note),
      width: 200
    },
    {
      title: "Thời gian sửa",
      key: "updatedAt",
      dataIndex: "updatedAt",
      sorter: (a, b) => compareDate(a.updatedAt, b.updatedAt),
      render: (value: string) => (value ? dayjs(value).format("HH:mm DD/MM/YYYY") : "")
    },
    {
      title: "Trạng thái",
      key: "status",
      dataIndex: "status",
      sorter: (a, b) => compareText(a.status, b.status),
      render: (status: InvoiceStatus) => <InvoiceStatusBadge status={status} />,
      fixed: "right"
    },
    ...(actionItems.length
      ? [
          {
            title: "",
            key: "operation",
            width: 50,
            render: (_: unknown, record: InvoiceProps) => (
              <Dropdown
                menu={{
                  items: actionItems,
                  onClick: (e) => {
                    if (e.key === "view-order-detail") {
                      handleViewOrderDetail(record);
                    }
                    if (e.key === "edit") {
                      handleEdit(record);
                    }
                    if (e.key === "update-status") {
                      handleUpdateStatus(record);
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

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-4 pt-4">
      <PageHeader
        left={<AppBreadcrumb />}
        right={
          <>
            {canView && (
              <Button
                variant="solid"
                color="green"
                icon={<Icon component={DownloadIcon} />}
                loading={isExporting}
                disabled={!invoices?.total}
                onClick={() => void handleExportExcel()}
              >
                Xuất Excel
              </Button>
            )}
            <RefreshButton loading={isFetching} onRefresh={() => refetch()} />
          </>
        }
      />

      <AutoHeightTable
        rowKey={(record) => record.id}
        dataSource={invoices?.data || []}
        columns={columns}
        bordered
        size="small"
        loading={isFetching}
        pagination={{
          current,
          onChange,
          total: invoices?.total || 0,
          size: "middle",
          pageSize,
          pageSizeOptions: [20, 50, 100],
          showSizeChanger: true,
          onShowSizeChange,
          showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`
        }}
      />

      {dialogOpen && (
        <InvoiceDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          editingItem={selectedItem}
        />
      )}

      {dialogUpdateStatusOpen && (
        <UpdateStatusInvoiceDialog
          open={dialogUpdateStatusOpen}
          onOpenChange={handleDialogUpdateStatusClose}
          editingItem={selectedItem}
        />
      )}

      {dialogViewOrderDetailOpen && selectedOrderId && (
        <OrderDetailDialog
          open={dialogViewOrderDetailOpen}
          onOpenChange={handleDialogViewOrderDetailClose}
          selectedOrderId={selectedOrderId}
        />
      )}
    </div>
  );
};

export default InvoicesPage;
