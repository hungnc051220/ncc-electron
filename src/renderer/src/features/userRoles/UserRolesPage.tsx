import { useCustomerRoles } from "@renderer/hooks/customerRoles/useCustomerRoles";
import { useRolePermissions } from "@renderer/hooks/permissions/useRolePermissions";
import { useUpdateRolePermissions } from "@renderer/hooks/permissions/useUpdateRolePermissions";
import { PERMISSION_ACTION_LABELS } from "@renderer/permissions/definitions";
import { buildPermissionMatrix } from "@renderer/permissions/utils";
import {
  ApiError,
  BulkUpdateRolePermissionsRequest,
  PermissionAction,
  PermissionMatrixRow,
  permissionActions
} from "@shared/types";
import type { MenuProps, TableProps } from "antd";
import { Breadcrumb, Button, Checkbox, Layout, Menu, message, Spin, Table } from "antd";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

const { Content } = Layout;
type MenuItem = Required<MenuProps>["items"][number];

type PermissionTreeRow = {
  id: string;
  key: string;
  label: string;
  route?: string;
  module?: string;
  actions: PermissionAction[];
  values: Record<PermissionAction, boolean>;
  children?: PermissionTreeRow[];
  isGroup?: boolean;
};

const buildTreeRows = (rows: PermissionMatrixRow[]): PermissionTreeRow[] => {
  const grouped = rows.reduce(
    (acc, row) => {
      acc[row.module] = [...(acc[row.module] ?? []), row];
      return acc;
    },
    {} as Record<string, PermissionMatrixRow[]>
  );

  return Object.entries(grouped).map(([module, features]) => {
    const supportedActions = permissionActions.filter((action) =>
      features.some((feature) => feature.actions.includes(action))
    );

    const values = permissionActions.reduce(
      (acc, action) => {
        const applicableFeatures = features.filter((feature) => feature.actions.includes(action));
        acc[action] =
          applicableFeatures.length > 0 &&
          applicableFeatures.every((feature) => feature.values[action]);
        return acc;
      },
      {} as Record<PermissionAction, boolean>
    );

    return {
      id: `group:${module}`,
      key: `group:${module}`,
      label: module,
      module,
      actions: supportedActions,
      values,
      isGroup: true,
      children: features.map((feature) => ({
        id: feature.id,
        key: feature.key,
        label: feature.label,
        route: feature.route,
        module: feature.module,
        actions: feature.actions,
        values: feature.values
      }))
    };
  });
};

const getRowToggleState = (row: PermissionTreeRow) => {
  const checked = row.actions.length > 0 && row.actions.every((action) => row.values[action]);
  const indeterminate = row.actions.some((action) => row.values[action]) && !checked;

  return { checked, indeterminate };
};

const UserRolesPage = () => {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [bodyData, setBodyData] = useState<PermissionMatrixRow[]>(buildPermissionMatrix());

  const { data, isPending } = useCustomerRoles();
  const { data: rolePermissions, isFetching: isFetchingPermissions } = useRolePermissions(
    selectedKey ? { roleIds: [Number(selectedKey)] } : undefined
  );
  const updateRolePermissions = useUpdateRolePermissions();

  useEffect(() => {
    if (!selectedKey && data?.length) {
      setSelectedKey(data[0].id.toString());
    }
  }, [data, selectedKey]);

  useEffect(() => {
    setBodyData(buildPermissionMatrix(rolePermissions?.[0]?.permissions));
  }, [rolePermissions]);

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

  const applyActionChange = useCallback(
    (
      rows: PermissionMatrixRow[],
      permissionKeys: string[],
      action: PermissionAction,
      checked: boolean
    ) =>
      rows.map((row) => {
        if (!permissionKeys.includes(row.key) || !row.actions.includes(action)) {
          return row;
        }

        const nextValues = {
          ...row.values,
          [action]: checked
        };

        if (action === "access" && !checked) {
          row.actions.forEach((supportedAction) => {
            nextValues[supportedAction] = false;
          });
        }

        if (action !== "access" && checked) {
          nextValues.access = true;
        }

        return {
          ...row,
          values: nextValues
        };
      }),
    []
  );

  const onTogglePermission = useCallback(
    (permissionKeys: string[], action: PermissionAction, checked: boolean) => {
      setBodyData((current) => applyActionChange(current, permissionKeys, action, checked));
    },
    [applyActionChange]
  );

  const onToggleAllActions = useCallback((permissionKeys: string[], checked: boolean) => {
    setBodyData((current) =>
      current.map((row) => {
        if (!permissionKeys.includes(row.key)) {
          return row;
        }

        const nextValues = { ...row.values };
        row.actions.forEach((action) => {
          nextValues[action] = checked;
        });

        return {
          ...row,
          values: nextValues
        };
      })
    );
  }, []);

  const visibleActions = permissionActions.filter((action) =>
    bodyData.some((row) => row.actions.includes(action))
  );
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const treeData = useMemo(() => buildTreeRows(bodyData), [bodyData]);

  const baseColumns: NonNullable<TableProps<PermissionTreeRow>["columns"]> = [
    {
      title: "Chọn tất",
      key: "select-all",
      width: 90,
      align: "center",
      render: (_, record) => {
        const featureKeys = record.isGroup
          ? (record.children ?? []).map((item) => item.key)
          : [record.key];
        const { checked, indeterminate } = getRowToggleState(record);

        return (
          <Checkbox
            checked={checked}
            indeterminate={indeterminate}
            onChange={(e) => onToggleAllActions(featureKeys, e.target.checked)}
          />
        );
      }
    },
    {
      title: "Tính năng",
      key: "label",
      dataIndex: "label",
      width: 320
    }
  ];

  const actionColumns: NonNullable<TableProps<PermissionTreeRow>["columns"]> = visibleActions.map(
    (action) => ({
      title: PERMISSION_ACTION_LABELS[action],
      key: action,
      align: "center",
      width: 80,
      render: (_, record) => (
        <Checkbox
          checked={record.values[action]}
          disabled={!record.actions.includes(action)}
          indeterminate={
            record.isGroup &&
            !!record.children?.some(
              (item) => item.actions.includes(action) && item.values[action]
            ) &&
            !record.values[action]
          }
          onChange={(e) =>
            onTogglePermission(
              record.isGroup ? (record.children ?? []).map((item) => item.key) : [record.key],
              action,
              e.target.checked
            )
          }
        />
      )
    })
  );

  const columns: TableProps<PermissionTreeRow>["columns"] = [...baseColumns, ...actionColumns];

  const onClick: MenuProps["onClick"] = (e) => {
    setSelectedKey(e.key);
  };

  const onUpdate = () => {
    if (!selectedKey) return;

    const payload: BulkUpdateRolePermissionsRequest = [
      {
        roleId: Number(selectedKey),
        permissions: bodyData.map((row) => ({
          permissionKey: row.key,
          actions: row.actions.reduce(
            (acc, action) => {
              acc[action] = row.values[action];
              return acc;
            },
            {} as PermissionMatrixRow["values"]
          )
        }))
      }
    ];

    updateRolePermissions.mutate(payload, {
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
                  dataSource={treeData}
                  columns={columns}
                  bordered
                  size="small"
                  pagination={false}
                  scroll={{ x: "max-content", y: "calc(100vh - 265px)" }}
                  expandable={{
                    defaultExpandAllRows: true
                  }}
                />
              </Content>
            </Layout>
          </Layout>
        </div>
      </div>
      <Spin
        spinning={isPending || isFetchingPermissions || updateRolePermissions.isPending}
        fullscreen
      />
    </>
  );
};

export default UserRolesPage;
