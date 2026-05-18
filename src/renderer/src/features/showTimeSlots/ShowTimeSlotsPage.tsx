import Icon, { MoreOutlined } from "@ant-design/icons";
import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import RefreshButton from "@renderer/components/RefreshButton";
import { useShowTimeSlots } from "@renderer/hooks/showTimeSlots/useShowTimeSlots";
import { formatNumber, compareText } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { DayPartProps } from "@shared/types";
import type { PaginationProps, TableProps } from "antd";
import { Button, Dropdown } from "antd";
import { PlusIcon, SquarePen, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import ShowTimeSlotDialog from "./components/ShowTimeSlotDialog";
import DeleteShowTimeSlotDialog from "./components/DeleteShowTimeSlotDialog";

const ShowTimeSlotsPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedShowTimeSlot, setSelectedShowTimeSlot] = useState<DayPartProps | null>(null);

  const params = useMemo(
    () => ({
      current,
      pageSize
    }),
    [current, pageSize]
  );

  const { data: showTimeSlots, isFetching, refetch } = useShowTimeSlots(params);
  const { can } = usePermission();
  const canCreate = can("showtime_slots", "create");
  const canUpdate = can("showtime_slots", "update");
  const canDelete = can("showtime_slots", "delete");

  const handleAdd = useCallback(() => {
    setSelectedShowTimeSlot(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((item: DayPartProps) => {
    setSelectedShowTimeSlot(item);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback((item: DayPartProps) => {
    setSelectedShowTimeSlot(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedShowTimeSlot(null);
    }
  }, []);

  const handleDeleteDialogClose = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setSelectedShowTimeSlot(null);
    }
  }, []);

  const actionItems = [
    ...(canUpdate ? [{ key: "1", icon: <SquarePen size={16} />, label: "Cập nhật" }] : []),
    ...(canDelete ? [{ key: "2", icon: <Trash2 size={16} />, label: "Xóa", danger: true }] : [])
  ];

  const columns: TableProps<DayPartProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
      width: 50,
      fixed: "left"
    },
    {
      title: "Tên khung giờ",
      key: "name",
      dataIndex: "name",
      sorter: (a, b) => compareText(a.name, b.name)
    },
    {
      title: "Loại ngày",
      key: "dateTypeId",
      dataIndex: "dateTypeId",
      sorter: (a, b) => a.dateTypeId - b.dateTypeId,
      render: (value: number) => (value === 1 ? "Ngày thường" : "Ngày lễ")
    },
    {
      title: "Thời gian bắt đầu",
      key: "fromTime",
      dataIndex: "fromTime",
      sorter: (a, b) => compareText(a.fromTime, b.fromTime)
    },
    {
      title: "Thời gian kết thúc",
      key: "toTime",
      dataIndex: "toTime",
      sorter: (a, b) => compareText(a.toTime, b.toTime)
    },
    ...(actionItems.length
      ? [
          {
            title: "",
            key: "operation",
            width: 50,
            render: (_: unknown, record: DayPartProps) => (
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
          <>
            <RefreshButton loading={isFetching} onRefresh={() => refetch()} />
            {canCreate && (
              <Button type="primary" onClick={handleAdd} icon={<Icon component={PlusIcon} />}>
                Thêm khung giờ chiếu
              </Button>
            )}
          </>
        }
      />

      <AutoHeightTable
        rowKey={(record) => record.id}
        dataSource={showTimeSlots?.data || []}
        columns={columns}
        bordered
        size="small"
        loading={isFetching}
        pagination={{
          current,
          onChange,
          total: showTimeSlots?.total || 0,
          size: "middle",
          pageSize,
          pageSizeOptions: [20, 50, 100],
          showSizeChanger: true,
          onShowSizeChange,
          showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`
        }}
      />

      {dialogOpen && (
        <ShowTimeSlotDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          editingShowTimeSlot={selectedShowTimeSlot}
        />
      )}
      {selectedShowTimeSlot && deleteDialogOpen && (
        <DeleteShowTimeSlotDialog
          open={deleteDialogOpen}
          onOpenChange={handleDeleteDialogClose}
          id={selectedShowTimeSlot.id}
          name={selectedShowTimeSlot.name}
        />
      )}
    </div>
  );
};

export default ShowTimeSlotsPage;
