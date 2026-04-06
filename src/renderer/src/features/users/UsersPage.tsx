import Icon, { MoreOutlined } from "@ant-design/icons";
import ChangeHiddenUserDialog from "@renderer/features/users/components/ChangeHiddenUserDialog";
import DeleteUserDialog from "@renderer/features/users/components/DeleteUserDialog";
import Filter from "@renderer/features/users/components/Filter";
import UserDialog from "@renderer/features/users/components/UserDialog";
import { useCustomerRoles } from "@renderer/hooks/customerRoles/useCustomerRoles";
import { usePermission } from "@renderer/permissions/usePermission";
import { useUsers } from "@renderer/hooks/users/useUsers";
import { filterEmptyValues, formatNumber } from "@renderer/lib/utils";
import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import { UserProps } from "@shared/types";
import type { MenuProps, PaginationProps, TableProps } from "antd";
import { Button, Dropdown } from "antd";
import { Check, Eye, EyeOff, PlusIcon, SquarePen, Trash2, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

export interface ValuesProps {
  roleId?: number;
  keyword?: string;
}

const UsersPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [changeHiddenDialogOpen, setChangeHiddenDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProps | null>(null);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filterValues, setFilterValues] = useState<ValuesProps>({});

  const params = useMemo(
    () => ({
      current,
      pageSize,
      ...filterEmptyValues(filterValues)
    }),
    [current, pageSize, filterValues]
  );

  const { data: users, isFetching } = useUsers(params);
  const { data: customerRoles, isFetching: isFetchingCustomerRoles } = useCustomerRoles();
  const { can } = usePermission();
  const canCreate = can("users", "create");
  const canUpdate = can("users", "update");
  const canDelete = can("users", "delete");

  const handleAdd = useCallback(() => {
    setSelectedUser(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((user: UserProps) => {
    setSelectedUser(user);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback((user: UserProps) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  }, []);

  const handleChangeHidden = useCallback((user: UserProps) => {
    setSelectedUser(user);
    setChangeHiddenDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedUser(null);
    }
  }, []);

  const handleDeleteDialogClose = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setSelectedUser(null);
    }
  }, []);

  const handleChangeHiddenDialogClose = useCallback((open: boolean) => {
    setChangeHiddenDialogOpen(open);
    if (!open) {
      setSelectedUser(null);
    }
  }, []);

  const onSearch = (values: ValuesProps) => {
    setFilterValues(values);
  };

  const onChange = (page: number) => {
    setCurrent(page);
  };

  const getActionItems = useCallback(
    (user: UserProps): MenuProps["items"] => [
      ...(canUpdate
        ? [
            {
              key: "1",
              icon: user.isHidden ? <Eye size={16} /> : <EyeOff size={16} />,
              label: user.isHidden ? "Hiện người dùng" : "Ẩn người dùng"
            },
            {
              key: "2",
              icon: <SquarePen size={16} />,
              label: "Cập nhật"
            }
          ]
        : []),
      ...(canDelete
        ? [
            {
              key: "3",
              icon: <Trash2 size={16} />,
              label: "Xóa",
              danger: true
            }
          ]
        : [])
    ],
    [canDelete, canUpdate]
  );

  const columns: TableProps<UserProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
      width: 50,
      fixed: "left"
    },
    {
      title: "Mã người dùng",
      key: "id",
      dataIndex: "id",
      width: 150,
      fixed: "left"
    },
    {
      title: "Họ và tên",
      key: "fullName",
      dataIndex: "fullName",
      render: (_, record) =>
        [record.customerFirstName, record.customerLastName].filter(Boolean).join(" ")
    },
    {
      title: "Tên đăng nhập",
      key: "username",
      dataIndex: "username"
    },
    {
      title: "Số điện thoại",
      key: "mobile",
      dataIndex: "mobile"
    },
    {
      title: "Email",
      key: "email",
      dataIndex: "email"
    },
    {
      title: "Địa chỉ",
      key: "address",
      dataIndex: "address"
    },
    {
      title: "Hiển thị",
      key: "isHidden",
      dataIndex: "isHidden",
      render: (isHidden) => {
        return (
          <div className="flex items-center justify-center">
            {!isHidden ? (
              <Check className="size-4 text-green-500" />
            ) : (
              <X className="size-4 text-red-500" />
            )}
          </div>
        );
      },
      width: 80,
      align: "center"
    },
    ...(canUpdate || canDelete
      ? [
          {
            title: "",
            key: "operation",
            width: 50,
            render: (_: unknown, record: UserProps) => (
              <Dropdown
                menu={{
                  items: getActionItems(record),
                  onClick: (e) => {
                    if (e.key === "1") {
                      handleChangeHidden(record);
                    }
                    if (e.key === "2") {
                      handleEdit(record);
                    }
                    if (e.key === "3") {
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
              onSearch={onSearch}
              filterValues={filterValues}
              setCurrent={setCurrent}
              customerRoles={customerRoles || []}
            />
            {canCreate && (
              <Button type="primary" onClick={handleAdd} icon={<Icon component={PlusIcon} />}>
                Thêm người dùng
              </Button>
            )}
          </>
        }
      />

      <AutoHeightTable
        rowKey={(record) => record.id}
        dataSource={users?.data || []}
        columns={columns}
        bordered
        size="small"
        loading={isFetching}
        pagination={{
          current,
          onChange,
          total: users?.total || 0,
          size: "middle",
          pageSize,
          pageSizeOptions: [20, 50, 100],
          showSizeChanger: true,
          onShowSizeChange,
          showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`
        }}
      />
      {dialogOpen && (
        <UserDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          editingUser={selectedUser}
          customerRoles={customerRoles || []}
          isFetchingCustomerRoles={isFetchingCustomerRoles}
        />
      )}
      {selectedUser && (
        <DeleteUserDialog
          open={deleteDialogOpen}
          onOpenChange={handleDeleteDialogClose}
          id={selectedUser.id}
          username={selectedUser.username}
        />
      )}
      {selectedUser && (
        <ChangeHiddenUserDialog
          open={changeHiddenDialogOpen}
          onOpenChange={handleChangeHiddenDialogClose}
          user={selectedUser}
          username={selectedUser.username}
        />
      )}
    </div>
  );
};

export default UsersPage;
