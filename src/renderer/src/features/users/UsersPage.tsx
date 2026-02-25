import Icon, { MoreOutlined } from "@ant-design/icons";
import ChangeHiddenUserDialog from "@renderer/features/users/components/ChangeHiddenUserDialog";
import DeleteUserDialog from "@renderer/features/users/components/DeleteUserDialog";
import Filter from "@renderer/features/users/components/Filter";
import UserDialog from "@renderer/features/users/components/UserDialog";
import { useCustomerRoles } from "@renderer/hooks/customerRoles/useCustomerRoles";
import { useGeneralData } from "@renderer/hooks/useGeneralData";
import { useUsers } from "@renderer/hooks/users/useUsers";
import { filterEmptyValues, formatNumber } from "@renderer/lib/utils";
import { UserProps } from "@shared/types";
import type { PaginationProps, TableProps } from "antd";
import { Breadcrumb, Button, Dropdown, Table } from "antd";
import { Check, PlusIcon, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router";

export interface ValuesProps {
  roleId?: number;
  keyword?: string;
}

const items = [
  { key: "1", label: "Ẩn/hiện" },
  { key: "2", label: "Cập nhật" },
  { key: "3", label: <p className="text-red-500">Xóa</p> }
];

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
  const { data: generalData } = useGeneralData();

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
      key: "customerFirstName",
      dataIndex: "customerFirstName"
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
    {
      title: "",
      key: "operation",
      width: 50,
      render: (_, record) => (
        <Dropdown
          menu={{
            items,
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
      align: "center",
      fixed: "right"
    }
  ];

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
              title: "Hệ thống"
            },
            {
              title: "Quản lý người dùng"
            }
          ]}
        />

        <div className="flex gap-2 items-center">
          <Filter
            onSearch={onSearch}
            filterValues={filterValues}
            setCurrent={setCurrent}
            customerRoles={customerRoles || []}
          />
          <Button type="primary" onClick={handleAdd} icon={<Icon component={PlusIcon} />}>
            Thêm người dùng
          </Button>
        </div>
      </div>

      <Table
        rowKey={(record) => record.id}
        dataSource={users?.data || []}
        columns={columns}
        bordered
        size="small"
        scroll={{ x: "max-content", y: "calc(100vh - 265px)" }}
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
          manufactureres={generalData?.manufacturers || []}
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
