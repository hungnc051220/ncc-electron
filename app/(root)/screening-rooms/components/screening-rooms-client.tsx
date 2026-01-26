"use client";

import { getScreeningRooms } from "@/data/loaders";
import { formatNumber } from "@/lib/utils";
import { RoomProps } from "@/types";
import Icon, { MoreOutlined } from "@ant-design/icons";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { PaginationProps, TableProps } from "antd";
import { Breadcrumb, Button, Dropdown, Table } from "antd";
import { PlusIcon } from "lucide-react";
import { useCallback, useState } from "react";
import DeleteScreeningRoomDialog from "./delete-sccreening-room-dialog";
import ScreeningRoomsDialog from "./screening-rooms-dialog";

const actionItems = [
  { key: "1", label: "Cập nhật" },
  { key: "2", label: <p className="text-red-500">Xóa</p> },
];

const ScreeningRoomsClient = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedScreeningRoom, setSelectedScreeningRoom] =
    useState<RoomProps | null>(null);

  const { data: screeningRooms, isFetching } = useQuery({
    queryKey: ["screening-rooms", { current, pageSize }],
    queryFn: () => {
      return getScreeningRooms({
        page: current,
        pageSize,
      });
    },
    placeholderData: keepPreviousData,
  });

  const handleAdd = useCallback(() => {
    setSelectedScreeningRoom(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((item: RoomProps) => {
    setSelectedScreeningRoom(item);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback((item: RoomProps) => {
    setSelectedScreeningRoom(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedScreeningRoom(null);
    }
  }, []);

  const handleDeleteDialogClose = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setSelectedScreeningRoom(null);
    }
  }, []);

  const columns: TableProps<RoomProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => (current - 1) * 20 + index + 1,
      width: 50,
      fixed: "left",
    },
    {
      title: "Phòng chiếu",
      key: "name",
      dataIndex: "name",
      width: 250,
    },
    {
      title: "Số tầng",
      key: "numberOfFloor",
      dataIndex: "numberOfFloor",
      align: "right",
    },
    {
      title: "Số hàng Tầng 1",
      key: "deepSizeF1",
      dataIndex: "deepSizeF1",
      align: "right",
    },
    {
      title: "Số ghế Tầng 1",
      key: "wideSizeF1",
      dataIndex: "wideSizeF1",
      align: "right",
    },
    {
      title: "Số hàng Tầng 2",
      key: "deepSizeF2",
      dataIndex: "deepSizeF2",
      align: "right",
    },
    {
      title: "Số ghế Tầng 2",
      key: "wideSizeF2",
      dataIndex: "wideSizeF2",
      align: "right",
    },
    {
      title: "Số hàng Tầng 3",
      key: "deepSizeF3",
      dataIndex: "deepSizeF3",
      align: "right",
    },
    {
      title: "Số ghế Tầng 3",
      key: "wideSizeF3",
      dataIndex: "wideSizeF3",
      align: "right",
    },
    {
      title: "Quy luật xếp ghế",
      key: "ruleOrder",
      dataIndex: "ruleOrder",
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
            },
          }}
          arrow
          trigger={["click"]}
        >
          <MoreOutlined />
        </Dropdown>
      ),
      align: "center",
      fixed: "right",
    },
  ];

  const onChange = (page: number) => {
    setCurrent(page);
  };

  const onShowSizeChange: PaginationProps["onShowSizeChange"] = (
    current,
    pageSize,
  ) => {
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
              href: "/",
            },
            {
              title: "Quản lý danh sách",
            },
            {
              title: "Danh sách phòng chiếu",
            },
          ]}
        />

        <div className="flex gap-2 items-center">
          <Button
            type="primary"
            onClick={handleAdd}
            icon={<Icon component={PlusIcon} />}
          >
            Thêm phòng chiếu
          </Button>
        </div>
      </div>

      <Table
        rowKey={(record) => record.id}
        dataSource={screeningRooms?.data || []}
        columns={columns}
        bordered
        size="small"
        scroll={{ x: "max-content", y: "calc(100vh - 220px)" }}
        loading={isFetching}
        pagination={{
          current,
          onChange,
          total: screeningRooms?.total || 0,
          size: "middle",
          pageSize,
          pageSizeOptions: [20, 50, 100],
          showSizeChanger: true,
          onShowSizeChange,
          showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`,
        }}
      />

      {dialogOpen && (
        <ScreeningRoomsDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          editingRoom={selectedScreeningRoom}
        />
      )}

      {selectedScreeningRoom && deleteDialogOpen && (
        <DeleteScreeningRoomDialog
          open={deleteDialogOpen}
          onOpenChange={handleDeleteDialogClose}
          id={selectedScreeningRoom.id}
          name={selectedScreeningRoom.name}
        />
      )}
    </div>
  );
};

export default ScreeningRoomsClient;
