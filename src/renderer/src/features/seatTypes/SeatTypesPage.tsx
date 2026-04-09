import Icon, { MoreOutlined } from "@ant-design/icons";
import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import { useSeatTypes } from "@renderer/hooks/seatTypes/useSeatTypes";
import { formatNumber } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { SeatTypeProps } from "@shared/types";
import type { PaginationProps, TableProps } from "antd";
import { Button, ColorPicker, Dropdown } from "antd";
import { Check, PlusIcon, SquarePen, Trash2, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import DeleteSeatTypeDialog from "./components/DeleteSeatTypeDialog";
import SeatTypesDialog from "./components/SeatTypeDialog";

const compareText = (left?: string | null, right?: string | null) =>
  (left || "").localeCompare(right || "", "vi", { sensitivity: "base" });

const SeatTypesPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSeatType, setSelectedSeatType] = useState<SeatTypeProps | null>(null);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const params = useMemo(
    () => ({
      current,
      pageSize
    }),
    [current, pageSize]
  );

  const { data: seatTypes, isFetching } = useSeatTypes(params);
  const { can } = usePermission();
  const canCreate = can("seat_types", "create");
  const canUpdate = can("seat_types", "update");
  const canDelete = can("seat_types", "delete");

  const handleAdd = useCallback(() => {
    setSelectedSeatType(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((item: SeatTypeProps) => {
    setSelectedSeatType(item);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback((item: SeatTypeProps) => {
    setSelectedSeatType(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedSeatType(null);
    }
  }, []);

  const handleDeleteDialogClose = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setSelectedSeatType(null);
    }
  }, []);

  const actionItems = [
    ...(canUpdate ? [{ key: "1", icon: <SquarePen size={16} />, label: "Cập nhật" }] : []),
    ...(canDelete ? [{ key: "2", icon: <Trash2 size={16} />, label: "Xóa", danger: true }] : [])
  ];

  const columns: TableProps<SeatTypeProps>["columns"] = [
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
      key: "positionCode",
      dataIndex: "positionCode",
      sorter: (a, b) => compareText(a.positionCode, b.positionCode)
    },
    {
      title: "Loại ghế, vị trí",
      key: "name",
      dataIndex: "name",
      sorter: (a, b) => compareText(a.name, b.name)
    },
    {
      title: "Là ghế ngồi",
      key: "isSeat",
      dataIndex: "isSeat",
      sorter: (a, b) => Number(a.isSeat) - Number(b.isSeat),
      render: (value: boolean) =>
        value ? <Check className="size-4 text-green-500" /> : <X className="size-4 text-red-500" />
    },
    {
      title: "Mặc định",
      key: "isDefault",
      dataIndex: "isDefault",
      sorter: (a, b) => Number(a.isDefault) - Number(b.isDefault),
      render: (value: boolean) =>
        value ? <Check className="size-4 text-green-500" /> : <X className="size-4 text-red-500" />
    },
    {
      title: "Màu ghế",
      key: "color",
      dataIndex: "color",
      render: (value: string) => (value ? <ColorPicker value={value} disabled /> : null)
    },
    {
      title: "Ảnh",
      key: "pictureUrl",
      dataIndex: "pictureUrl",
      render: (value: string) =>
        value ? (
          <img src={value} alt="seat" className="object-cover object-center rounded-md size-20" />
        ) : null
    },
    ...(actionItems.length
      ? [
          {
            title: "",
            key: "operation",
            width: 50,
            render: (_: unknown, record: SeatTypeProps) => (
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
              Thêm loại ghế, vị trí
            </Button>
          ) : undefined
        }
      />

      <AutoHeightTable
        rowKey={(record) => record.id}
        dataSource={seatTypes?.data || []}
        columns={columns}
        bordered
        size="small"
        loading={isFetching}
        pagination={{
          current,
          onChange,
          total: seatTypes?.total || 0,
          size: "middle",
          pageSize,
          pageSizeOptions: [20, 50, 100],
          showSizeChanger: true,
          onShowSizeChange,
          showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`
        }}
      />

      {dialogOpen && (
        <SeatTypesDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          editingSeatType={selectedSeatType}
        />
      )}
      {selectedSeatType && deleteDialogOpen && (
        <DeleteSeatTypeDialog
          open={deleteDialogOpen}
          onOpenChange={handleDeleteDialogClose}
          id={selectedSeatType.id}
          name={selectedSeatType.name}
        />
      )}
    </div>
  );
};

export default SeatTypesPage;
