import { MoreOutlined } from "@ant-design/icons";
import { useInvoices } from "@renderer/hooks/invoices/useInvoices";
import { formatNumber } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { InvoiceProps, InvoiceStatus } from "@shared/types";
import type { PaginationProps, TableProps } from "antd";
import { Breadcrumb, Dropdown, Table } from "antd";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router";
import InvoiceDialog from "./components/InvoiceDialog";
import { InvoiceStatusBadge } from "./components/InvoiceStatusBadge";
import UpdateStatusInvoiceDialog from "./components/UpdateStatusInvoiceDialog";
import dayjs from "dayjs";

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
        { key: "1", label: "Cập nhật" },
        { key: "2", label: "Thay đổi trạng thái" }
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
      render: (value: string) => (value === "personal" ? "Cá nhân" : "Đơn vị"),
      fixed: "left"
    },
    {
      title: "Mã vé",
      key: "orderId",
      dataIndex: "orderId",
      fixed: "left"
    },
    {
      title: "Tên người mua/đơn vị",
      key: "partyA",
      dataIndex: "partyA"
    },
    {
      title: "Địa chỉ",
      key: "address",
      dataIndex: "address"
    },
    {
      title: "Email",
      key: "email",
      dataIndex: "email"
    },
    {
      title: "Số điện thoại",
      key: "phoneNumber",
      dataIndex: "phoneNumber"
    },
    {
      title: "Mã số thuế",
      key: "taxCode",
      dataIndex: "taxCode"
    },
    {
      title: "Căn cước công dân",
      key: "citizenId",
      dataIndex: "citizenId"
    },
    {
      title: "Đại diện",
      key: "representative",
      dataIndex: "representative"
    },
    {
      title: "Chức vụ",
      key: "position",
      dataIndex: "position"
    },
    {
      title: "Hợp đồng số",
      key: "contractCode",
      dataIndex: "contractCode"
    },
    {
      title: "Thời gian tạo",
      key: "createdAt",
      dataIndex: "createdAt",
      render: (value: string) => dayjs(value).format("HH:mm DD/MM/YYYY")
    },
    {
      title: "Thời gian sửa",
      key: "updatedAt",
      dataIndex: "updatedAt",
      render: (value: string) => (value ? dayjs(value).format("HH:mm DD/MM/YYYY") : "")
    },
    {
      title: "Trạng thái",
      key: "status",
      dataIndex: "status",
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
    <div className="space-y-3 mt-4 px-4">
      <div className="flex items-center justify-between">
        <Breadcrumb
          items={[
            {
              title: <Link to="/">Trang chủ</Link>
            },
            {
              title: "Quản lý danh sách"
            },
            {
              title: "Danh sách hóa đơn diện tử"
            }
          ]}
        />
      </div>

      <Table
        rowKey={(record) => record.id}
        dataSource={invoices?.data || []}
        columns={columns}
        bordered
        size="small"
        scroll={{ x: "max-content", y: "calc(100vh - 265px)" }}
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
