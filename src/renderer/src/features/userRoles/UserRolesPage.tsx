import { useCustomerRoleMenu } from "@renderer/hooks/customerRoles/useCustomerRoleMenu";
import { useCustomerRoles } from "@renderer/hooks/customerRoles/useCustomerRoles";
import { useUpdateCustomerRoleMenu } from "@renderer/hooks/customerRoles/useUpdateCustomerRoleMenu";
import { ApiError, CustomerRoleMenuProps } from "@shared/types";
import type { MenuProps, TableProps } from "antd";
import { Breadcrumb, Button, Checkbox, Layout, Menu, message, Spin, Table } from "antd";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";

const { Content } = Layout;
type MenuItem = Required<MenuProps>["items"][number];

const UserRolesPage = () => {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [bodyData, setBodyData] = useState<CustomerRoleMenuProps[] | undefined>(undefined);

  const { data, isPending } = useCustomerRoles();
  const { data: menu, isFetching: isFetchingMenu } = useCustomerRoleMenu(
    selectedKey ? { roleIds: [Number(selectedKey)] } : undefined
  );
  const updateCustomerRoleMenu = useUpdateCustomerRoleMenu();

  useEffect(() => {
    setBodyData(menu);
  }, [menu]);

  const items: MenuItem[] = [
    {
      key: "roles",
      label: "Nhóm người dùng",
      type: "group",
      children: data?.map((item) => ({
        key: item.id.toString(),
        label: item.name
      }))
    }
  ];

  const onChangeEdit = useCallback(
    (id: number, checked: boolean) => {
      if (!bodyData) return;
      const indexItem = bodyData?.findIndex((x) => x.id === id);
      const newData = [...bodyData];
      newData[indexItem].edit = checked as boolean;
      setBodyData(newData);
    },
    [bodyData]
  );

  const onChangeReadOnly = useCallback(
    (id: number, checked: boolean) => {
      if (!bodyData) return;
      const indexItem = bodyData?.findIndex((x) => x.id === id);
      const newData = [...bodyData];
      newData[indexItem].readOnly = checked as boolean;
      setBodyData(newData);
    },
    [bodyData]
  );

  const columns: TableProps<CustomerRoleMenuProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => index + 1,
      width: 50
    },
    {
      title: "Tên chức năng",
      key: "menuName",
      dataIndex: "menuName"
    },
    {
      title: "Sửa",
      key: "edit",
      dataIndex: "edit",
      render: (_, record) => (
        <Checkbox
          checked={record.edit}
          onChange={(e) => onChangeEdit(record.id, e.target.checked)}
        />
      ),
      width: 70,
      align: "center"
    },
    {
      title: "Đọc",
      key: "readOnly",
      dataIndex: "readOnly",
      render: (_, record) => (
        <Checkbox
          checked={record.readOnly}
          onChange={(e) => onChangeReadOnly(record.id, e.target.checked)}
        />
      ),
      width: 70,
      align: "center"
    }
  ];

  const onClick: MenuProps["onClick"] = (e) => {
    setSelectedKey(e.key);
  };

  const onUpdate = () => {
    if (!bodyData) return;
    updateCustomerRoleMenu.mutate(bodyData, {
      onSuccess: () => {
        message.success("Lưu thông tin quyền người dùng thành công");
      },
      onError: (error: unknown) => {
        let msg = "Lưu thông tin quyền người dùng thất bại";

        if (axios.isAxiosError<ApiError>(error)) {
          msg = error.response?.data?.message ?? msg;
        }

        message.error(msg);
      }
    });
  };

  return (
    <>
      <div className="space-y-4 flex-1 h-full p-4 pb-0 flex flex-col">
        <Breadcrumb
          items={[
            {
              title: <Link to="/">Trang chủ</Link>
            },
            {
              title: "Hệ thống"
            },
            {
              title: "Phân quyền nhóm người dùng"
            }
          ]}
        />

        <div className="flex-1">
          <Layout hasSider className="flex-1 h-full">
            <Menu
              selectedKeys={selectedKey ? [selectedKey] : []}
              onClick={onClick}
              style={{ width: 256 }}
              defaultSelectedKeys={["1"]}
              defaultOpenKeys={["settings"]}
              mode="inline"
              items={items}
              className="h-full"
            />
            <Layout>
              <Content className="bg-app-bg px-6">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm text-gray-500">
                    Nhóm người dùng đang chọn:{" "}
                    <span className="font-semibold text-primary">
                      {data?.find((role) => role.id === Number(selectedKey))?.name}
                    </span>
                  </h4>
                  <Button type="primary" onClick={onUpdate}>
                    Lưu thay đổi
                  </Button>
                </div>
                <Table
                  rowKey="id"
                  dataSource={bodyData || []}
                  columns={columns}
                  bordered
                  size="small"
                  pagination={false}
                  loading={isFetchingMenu}
                  scroll={{ y: "calc(100vh - 265px)" }}
                />
              </Content>
            </Layout>
          </Layout>
        </div>
      </div>
      <Spin spinning={isPending || updateCustomerRoleMenu.isPending} fullscreen />
    </>
  );
};

export default UserRolesPage;
