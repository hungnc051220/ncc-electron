import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import PageHeader from "@renderer/components/PageHeader";
import { useCustomerRoles } from "@renderer/hooks/customerRoles/useCustomerRoles";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { useRolePermissions } from "@renderer/hooks/permissions/useRolePermissions";
import { useUpdateRolePermissions } from "@renderer/hooks/permissions/useUpdateRolePermissions";
import { PERMISSION_ACTION_LABELS } from "@renderer/permissions/definitions";
import { buildPermissionMatrix } from "@renderer/permissions/utils";
import {
  BulkUpdateRolePermissionsRequest,
  PermissionAction,
  permissionActions,
  PermissionMatrixRow
} from "@shared/types";
import { useQueryClient } from "@tanstack/react-query";
import type { MenuProps, TableProps } from "antd";
import { Button, Checkbox, Layout, Menu, message, Table } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";

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

const SETTINGS_PERMISSION_KEYS = [
  "settings_branch",
  "settings_pos",
  "settings_endpoint",
  "settings_interface"
];

const buildAggregateValues = (rows: PermissionTreeRow[]): Record<PermissionAction, boolean> =>
  permissionActions.reduce(
    (acc, action) => {
      const applicableRows = rows.filter((row) => row.actions.includes(action));
      acc[action] = applicableRows.length > 0 && applicableRows.every((row) => row.values[action]);
      return acc;
    },
    {} as Record<PermissionAction, boolean>
  );

const buildGroupRow = (
  id: string,
  label: string,
  children: PermissionTreeRow[],
  module?: string
): PermissionTreeRow => ({
  id,
  key: id,
  label,
  module,
  actions: permissionActions.filter((action) =>
    children.some((child) => child.actions.includes(action))
  ),
  values: buildAggregateValues(children),
  children,
  isGroup: true
});

const mapFeatureToTreeRow = (feature: PermissionMatrixRow): PermissionTreeRow => ({
  id: feature.id,
  key: feature.key,
  label: feature.label,
  route: feature.route,
  module: feature.module,
  actions: feature.actions,
  values: feature.values
});

const getLeafRows = (row: PermissionTreeRow): PermissionTreeRow[] => {
  if (!row.children?.length) {
    return [row];
  }

  return row.children.flatMap(getLeafRows);
};

const getLeafPermissionKeys = (row: PermissionTreeRow) => getLeafRows(row).map((item) => item.key);

const hasAnyDescendantValue = (row: PermissionTreeRow, action: PermissionAction) =>
  row.children?.some((child) =>
    child.actions.includes(action)
      ? child.values[action] || hasAnyDescendantValue(child, action)
      : hasAnyDescendantValue(child, action)
  ) ?? false;

const buildTreeRows = (rows: PermissionMatrixRow[]): PermissionTreeRow[] => {
  const grouped = rows.reduce(
    (acc, row) => {
      acc[row.module] = [...(acc[row.module] ?? []), row];
      return acc;
    },
    {} as Record<string, PermissionMatrixRow[]>
  );

  return Object.entries(grouped).map(([module, features]) => {
    if (module !== "Hệ thống") {
      return buildGroupRow(`group:${module}`, module, features.map(mapFeatureToTreeRow), module);
    }

    const systemSettingFeatures = features.filter((feature) =>
      SETTINGS_PERMISSION_KEYS.includes(feature.key)
    );
    const otherFeatures = features.filter(
      (feature) => !SETTINGS_PERMISSION_KEYS.includes(feature.key)
    );

    const children: PermissionTreeRow[] = otherFeatures.map(mapFeatureToTreeRow);

    if (systemSettingFeatures.length) {
      children.push(
        buildGroupRow(
          "group:system_settings",
          "Thiết lập hệ thống",
          systemSettingFeatures.map((feature) => ({
            ...mapFeatureToTreeRow(feature),
            label: feature.label.startsWith("Thiết lập hệ thống - ")
              ? feature.label.replace("Thiết lập hệ thống - ", "")
              : feature.label
          })),
          module
        )
      );
    }

    return buildGroupRow(`group:${module}`, module, children, module);
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
  const queryClient = useQueryClient();

  const { data } = useCustomerRoles();
  const { data: rolePermissions } = useRolePermissions(
    selectedKey ? { roleIds: [Number(selectedKey)] } : undefined
  );
  const updateRolePermissions = useUpdateRolePermissions();

  useEffect(() => {
    if (!selectedKey && data?.length) {
      setSelectedKey(data[0].id.toString());
    }
  }, [data, selectedKey]);

  useEffect(() => {
    if (rolePermissions?.[0]) {
      setBodyData(buildPermissionMatrix(rolePermissions[0].permissions));
    }
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
        const featureKeys = record.isGroup ? getLeafPermissionKeys(record) : [record.key];
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
            record.isGroup && hasAnyDescendantValue(record, action) && !record.values[action]
          }
          onChange={(e) =>
            onTogglePermission(
              record.isGroup ? getLeafPermissionKeys(record) : [record.key],
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
        queryClient.setQueryData(
          ["role-permissions", JSON.stringify({ roleIds: [Number(selectedKey)] })],
          [
            {
              roleId: Number(selectedKey),
              roleName: data?.find((role) => role.id === Number(selectedKey))?.name ?? "",
              permissions: payload[0].permissions
            }
          ]
        );
        message.success("Lưu thông tin quyền người dùng thành công");
      },
      onError: (error: unknown) => {
        message.error(getApiErrorMessage(error, "Lưu thông tin quyền người dùng thất bại"));
      }
    });
  };

  return (
    <>
      <div className="space-y-4 flex-1 h-full p-4 pb-0 flex flex-col">
        <PageHeader left={<AppBreadcrumb />} />

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
                  <Button
                    type="primary"
                    onClick={onUpdate}
                    loading={updateRolePermissions.isPending}
                  >
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
    </>
  );
};

export default UserRolesPage;
