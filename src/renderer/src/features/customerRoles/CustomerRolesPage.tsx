import Icon, { MoreOutlined } from "@ant-design/icons";
import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import { useCustomerRoles } from "@renderer/hooks/customerRoles/useCustomerRoles";
import { formatNumber } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { CustomerRoleProps } from "@shared/types";
import { Button, Dropdown } from "antd";
import type { PaginationProps, TableProps } from "antd";
import { Check, PlusIcon, SquarePen, Trash2, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import CustomerRoleDialog from "./components/CustomerRoleDialog";
import DeleteCustomerRoleDialog from "./components/DeleteCustomerRoleDialog";

const CustomerRolesPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCustomerRole, setSelectedCustomerRole] = useState<CustomerRoleProps | null>(null);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: customerRoles, isFetching } = useCustomerRoles();
  const { can } = usePermission();
  const canCreate = can("user_roles", "update");
  const canUpdate = can("user_roles", "update");
  const canDelete = can("user_roles", "update");

  const paginatedCustomerRoles = useMemo(() => {
    if (!customerRoles?.length) {
      return [];
    }

    const start = (current - 1) * pageSize;
    return customerRoles.slice(start, start + pageSize);
  }, [current, customerRoles, pageSize]);

  const handleAdd = useCallback(() => {
    setSelectedCustomerRole(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((item: CustomerRoleProps) => {
    setSelectedCustomerRole(item);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback((item: CustomerRoleProps) => {
    setSelectedCustomerRole(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedCustomerRole(null);
    }
  }, []);

  const handleDeleteDialogClose = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setSelectedCustomerRole(null);
    }
  }, []);

  const actionItems = useMemo(
    () => [
      ...(canUpdate ? [{ key: "1", icon: <SquarePen size={16} />, label: "Cập nhật" }] : []),
      ...(canDelete ? [{ key: "2", icon: <Trash2 size={16} />, label: "Xóa", danger: true }] : [])
    ],
    [canDelete, canUpdate]
  );

  const columns: TableProps<CustomerRoleProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
      width: 50,
      fixed: "left"
    },
    {
      title: "Mã",
      key: "id",
      dataIndex: "id",
      width: 90
    },
    {
      title: "Tên nhóm người dùng",
      key: "name",
      dataIndex: "name"
    },
    {
      title: "Tên hệ thống",
      key: "systemName",
      dataIndex: "systemName"
    },
    {
      title: "Kích hoạt",
      key: "active",
      dataIndex: "active",
      align: "center",
      width: 90,
      render: (value: boolean) =>
        value ? (
          <Check className="mx-auto size-4 text-green-500" />
        ) : (
          <X className="mx-auto size-4 text-red-500" />
        )
    },
    ...(actionItems.length
      ? [
          {
            title: "",
            key: "operation",
            width: 50,
            render: (_: unknown, record: CustomerRoleProps) => (
              <Dropdown
                menu={{
                  items: actionItems,
                  onClick: (e) => {
                    if (e.key === "1") {
                      handleEdit(record);
                    }
                    if (e.key === "2") {
                      handleDelete(record);
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
          canCreate ? (
            <Button type="primary" onClick={handleAdd} icon={<Icon component={PlusIcon} />}>
              Thêm nhóm người dùng
            </Button>
          ) : undefined
        }
      />

      <AutoHeightTable
        rowKey={(record) => record.id}
        dataSource={paginatedCustomerRoles}
        columns={columns}
        bordered
        size="small"
        loading={isFetching}
        pagination={{
          current,
          onChange,
          total: customerRoles?.length || 0,
          size: "middle",
          pageSize,
          pageSizeOptions: [20, 50, 100],
          showSizeChanger: true,
          onShowSizeChange,
          showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`
        }}
      />

      {dialogOpen && (
        <CustomerRoleDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          editingCustomerRole={selectedCustomerRole}
        />
      )}

      {selectedCustomerRole && deleteDialogOpen && (
        <DeleteCustomerRoleDialog
          open={deleteDialogOpen}
          onOpenChange={handleDeleteDialogClose}
          id={selectedCustomerRole.id}
          name={selectedCustomerRole.name}
        />
      )}
    </div>
  );
};

export default CustomerRolesPage;
