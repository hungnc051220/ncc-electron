import Icon, { MoreOutlined } from "@ant-design/icons";
import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import { useManufacturers } from "@renderer/hooks/manufacturers/useManufacturers";
import { usePermission } from "@renderer/permissions/usePermission";
import { ManufacturerProps } from "@shared/types";
import type { MenuProps, PaginationProps, TableProps } from "antd";
import { Button, Dropdown } from "antd";
import { Check, Eye, EyeOff, PlusIcon, SquarePen, Trash2, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import DeleteManufacturerDialog from "./components/DeleteManufacturerDialog";
import ManufacturerDialog from "./components/ManufacturerDialog";
import { formatNumber } from "@renderer/lib/utils";
import ChangeHiddenManufacturerDialog from "./components/ChangeHiddenManufacturerDialog";

const compareText = (left?: string | null, right?: string | null) =>
  (left || "").localeCompare(right || "", "vi", { sensitivity: "base" });

const ManufacturersPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedManufacturer, setSelectedManufacturer] = useState<ManufacturerProps | null>(null);
  const [changeHiddenDialogOpen, setChangeHiddenDialogOpen] = useState(false);

  const params = useMemo(
    () => ({
      current,
      pageSize
    }),
    [current, pageSize]
  );

  const { data: manufacturers, isFetching } = useManufacturers(params);
  const { can } = usePermission();
  const canCreate = can("manufacturers", "create");
  const canUpdate = can("manufacturers", "update");
  const canDelete = can("manufacturers", "delete");

  const handleAdd = useCallback(() => {
    setSelectedManufacturer(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((item: ManufacturerProps) => {
    setSelectedManufacturer(item);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback((item: ManufacturerProps) => {
    setSelectedManufacturer(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedManufacturer(null);
    }
  }, []);

  const handleDeleteDialogClose = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setSelectedManufacturer(null);
    }
  }, []);

  const handleChangeHidden = useCallback((item: ManufacturerProps) => {
    setSelectedManufacturer(item);
    setChangeHiddenDialogOpen(true);
  }, []);

  const handleChangeHiddenDialogClose = useCallback((open: boolean) => {
    setChangeHiddenDialogOpen(open);
    if (!open) {
      setSelectedManufacturer(null);
    }
  }, []);

  const getActionItems = useCallback(
    (item: ManufacturerProps): MenuProps["items"] => [
      ...(canUpdate
        ? [
            { key: "1", icon: <SquarePen size={16} />, label: "Cập nhật" },
            {
              key: "2",
              icon: item.isHidden ? <Eye size={16} /> : <EyeOff size={16} />,
              label: item.isHidden ? "Hiện hãng phim" : "Ẩn hãng phim"
            }
          ]
        : []),
      ...(canDelete ? [{ key: "3", icon: <Trash2 size={16} />, label: "Xóa", danger: true }] : [])
    ],
    [canDelete, canUpdate]
  );

  const columns: TableProps<ManufacturerProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
      width: 50,
      fixed: "left"
    },
    {
      title: "Hãng phim phát hành",
      key: "name",
      dataIndex: "name",
      sorter: (a, b) => compareText(a.name, b.name),
      fixed: "left"
    },
    {
      title: "Tên công ty",
      key: "fullName",
      dataIndex: "fullName",
      sorter: (a, b) => compareText(a.fullName, b.fullName)
    },
    {
      title: "Địa chỉ công ty",
      key: "address",
      dataIndex: "address",
      sorter: (a, b) => compareText(a.address, b.address)
    },
    {
      title: "Ẩn/Hiện",
      key: "isHidden",
      dataIndex: "isHidden",
      render: (value: boolean) => (
        <div className="flex items-center justify-center">
          {!value ? (
            <Check className="size-4 text-green-500" />
          ) : (
            <X className="size-4 text-red-500" />
          )}
        </div>
      ),
      align: "center",
      width: 100,
      sorter: (a, b) => Number(a.isHidden) - Number(b.isHidden)
    },
    ...(canUpdate || canDelete
      ? [
          {
            title: "",
            key: "operation",
            width: 50,
            render: (_: unknown, record: ManufacturerProps) => (
              <Dropdown
                menu={{
                  items: getActionItems(record),
                  onClick: (e) => {
                    if (e.key === "1") {
                      handleEdit(record);
                    }
                    if (e.key === "2") {
                      handleChangeHidden(record);
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
              Thêm hãng phim
            </Button>
          ) : undefined
        }
      />

      <AutoHeightTable
        rowKey={(record) => record.id}
        dataSource={manufacturers?.data || []}
        columns={columns}
        bordered
        size="small"
        loading={isFetching}
        pagination={{
          current,
          onChange,
          total: manufacturers?.total || 0,
          size: "middle",
          pageSize,
          pageSizeOptions: [20, 50, 100],
          showSizeChanger: true,
          onShowSizeChange,
          showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`
        }}
      />

      {dialogOpen && (
        <ManufacturerDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          editingManufacturer={selectedManufacturer}
        />
      )}
      {selectedManufacturer && (
        <DeleteManufacturerDialog
          open={deleteDialogOpen}
          onOpenChange={handleDeleteDialogClose}
          id={selectedManufacturer.id}
          name={selectedManufacturer.name}
        />
      )}
      {changeHiddenDialogOpen && selectedManufacturer && (
        <ChangeHiddenManufacturerDialog
          name={selectedManufacturer.name}
          manufacturer={selectedManufacturer}
          onOpenChange={handleChangeHiddenDialogClose}
          open={changeHiddenDialogOpen}
        />
      )}
    </div>
  );
};

export default ManufacturersPage;
