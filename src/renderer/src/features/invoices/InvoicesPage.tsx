import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import { MoreOutlined } from "@ant-design/icons";
import { useInvoices } from "@renderer/hooks/invoices/useInvoices";
import { formatNumber } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { InvoiceProps, InvoiceStatus } from "@shared/types";
import type { PaginationProps, TableProps } from "antd";
import { Dropdown } from "antd";
import { RefreshCcw, SquarePen } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import InvoiceDialog from "./components/InvoiceDialog";
import { InvoiceStatusBadge } from "./components/InvoiceStatusBadge";
import UpdateStatusInvoiceDialog from "./components/UpdateStatusInvoiceDialog";
import dayjs from "dayjs";

const compareText = (left?: string | null, right?: string | null) =>
  (left || "").localeCompare(right || "", "vi", { sensitivity: "base" });

const compareDate = (left?: string | null, right?: string | null) =>
  dayjs(left).valueOf() - dayjs(right).valueOf();

const InvoicesPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogUpdateStatusOpen, setDialogUpdateStatusOpen] = useState(false);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedItem, setSelectedItem] = useState<InvoiceProps | null>(null);

  const params = useMemo(
    () => ({
      current,
      pageSize
    }),
    [current, pageSize]
  );

  const { data: invoices, isFetching } = useInvoices(params);
  const { can } = usePermission();
  const canUpdate = can("invoices", "update");

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

  const actionItems = canUpdate
    ? [
        { key: "1", icon: <SquarePen size={16} />, label: "Cập nhật" },
        { key: "2", icon: <RefreshCcw size={16} />, label: "Thay đổi trạng thái" }
      ]
    : [];

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
      title: "Loại hóa đơn",
      key: "invoiceType",
      dataIndex: "invoiceType",
      sorter: (a, b) =>
        compareText(
          a.invoiceType === "personal" ? "Cá nhân" : "Đơn vị",
          b.invoiceType === "personal" ? "Cá nhân" : "Đơn vị"
        ),
      render: (value: string) => (value === "personal" ? "Cá nhân" : "Đơn vị"),
      fixed: "left"
    },
    {
      title: "Mã vé",
      key: "barCode",
      dataIndex: "order",
      sorter: (a, b) => compareText(a.order?.barCode, b.order?.barCode),
      render: (order) => order?.barCode
    },
    {
      title: "Tên người mua/đơn vị",
      key: "partyA",
      dataIndex: "partyA",
      sorter: (a, b) => compareText(a.partyA, b.partyA)
    },
    {
      title: "Địa chỉ",
      key: "address",
      dataIndex: "address",
      sorter: (a, b) => compareText(a.address, b.address)
    },
    {
      title: "Email",
      key: "email",
      dataIndex: "email",
      sorter: (a, b) => compareText(a.email, b.email)
    },
    {
      title: "Số điện thoại",
      key: "phoneNumber",
      dataIndex: "phoneNumber",
      sorter: (a, b) => compareText(a.phoneNumber, b.phoneNumber)
    },
    {
      title: "Mã số thuế",
      key: "taxCode",
      dataIndex: "taxCode",
      sorter: (a, b) => compareText(a.taxCode, b.taxCode)
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
      title: "Thời gian tạo",
      key: "createdAt",
      dataIndex: "createdAt",
      sorter: (a, b) => compareDate(a.createdAt, b.createdAt),
      render: (value: string) => dayjs(value).format("HH:mm DD/MM/YYYY")
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
                    if (e.key === "1") {
                      handleEdit(record);
                    }
                    if (e.key === "2") {
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
      <PageHeader left={<AppBreadcrumb />} />

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
    </div>
  );
};

export default InvoicesPage;
