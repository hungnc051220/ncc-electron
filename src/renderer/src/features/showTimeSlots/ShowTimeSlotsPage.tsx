"use client";

import Icon, { MoreOutlined } from "@ant-design/icons";
import { useShowTimeSlots } from "@renderer/hooks/showTimeSlots/useShowTimeSlots";
import { formatNumber } from "@renderer/lib/utils";
import { DayPartProps } from "@renderer/types";
import type { PaginationProps, TableProps } from "antd";
import { Breadcrumb, Button, Dropdown, Table } from "antd";
import { PlusIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import ShowTimeSlotDialog from "./components/ShowTimeSlotDialog";
import DeleteShowTimeSlotDialog from "./components/DeleteShowTimeSlotDialog";

const actionItems = [
  { key: "1", label: "Cập nhật" },
  { key: "2", label: <p className="text-red-500">Xóa</p> }
];

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

  const { data: showTimeSlots, isFetching } = useShowTimeSlots(params);

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
      dataIndex: "name"
    },
    {
      title: "Loại ngày",
      key: "dateTypeId",
      dataIndex: "dateTypeId",
      render: (value: number) => (value === 1 ? "Ngày thường" : "Ngày lễ")
    },
    {
      title: "Thời gian bắt đầu",
      key: "fromTime",
      dataIndex: "fromTime"
    },
    {
      title: "Thời gian kết thúc",
      key: "toTime",
      dataIndex: "toTime"
    },
    {
      title: "",
      key: "operation",
      width: 50,
      render: (_, record) => (
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
      align: "center",
      fixed: "right"
    }
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
              title: "Trang chủ",
              href: "/"
            },
            {
              title: "Quản lý danh sách"
            },
            {
              title: "Danh sách khung giờ chiếu"
            }
          ]}
        />

        <div className="flex gap-2 items-center">
          <Button type="primary" onClick={handleAdd} icon={<Icon component={PlusIcon} />}>
            Thêm khung giờ chiếu
          </Button>
        </div>
      </div>

      <Table
        rowKey={(record) => record.id}
        dataSource={showTimeSlots?.data || []}
        columns={columns}
        bordered
        size="small"
        scroll={{ x: "max-content", y: "calc(100vh - 265px)" }}
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
