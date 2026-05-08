import Icon, { MoreOutlined } from "@ant-design/icons";
import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import { usePermission } from "@renderer/permissions/usePermission";
import { useScreeningRooms } from "@renderer/hooks/screeningRooms/useScreeningRooms";
import { formatNumber, compareText, compareNumber } from "@renderer/lib/utils";
import { RoomProps } from "@shared/types";
import type { MenuProps, PaginationProps, TableProps } from "antd";
import { Button, Dropdown } from "antd";
import { Armchair, Check, Eye, EyeOff, PlusIcon, SquarePen, Trash2, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import DeleteScreeningRoomDialog from "./components/DeleteScreeningRoomDialog";
import ScreeningRoomsDialog from "./components/ScreeningRoomsDialog";
import { useNavigate } from "react-router";
import ChangeHiddenScreeningRoomDialog from "./components/ChangeHiddenScreeningRoomDialog";

const ScreeningRoomsPage = () => {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [changeHiddenDialogOpen, setChangeHiddenDialogOpen] = useState(false);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedScreeningRoom, setSelectedScreeningRoom] = useState<RoomProps | null>(null);

  const params = useMemo(
    () => ({
      current,
      pageSize
    }),
    [current, pageSize]
  );

  const { data: screeningRooms, isFetching } = useScreeningRooms(params);
  const { can } = usePermission();
  const canCreate = can("screening_rooms", "create");
  const canUpdate = can("screening_rooms", "update");
  const canDelete = can("screening_rooms", "delete");
  const canConfigure = can("screening_rooms", "configure");

  const handleAdd = useCallback(() => {
    setSelectedScreeningRoom(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((item: RoomProps) => {
    setSelectedScreeningRoom(item);
    setDialogOpen(true);
  }, []);

  const handleChangeHidden = useCallback((item: RoomProps) => {
    setSelectedScreeningRoom(item);
    setChangeHiddenDialogOpen(true);
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

  const handleChangeHiddenDialogClose = useCallback((open: boolean) => {
    setChangeHiddenDialogOpen(open);
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

  const getActionItems = useCallback(
    (item: RoomProps): MenuProps["items"] => [
      ...(canUpdate
        ? [
            { key: "1", icon: <SquarePen size={16} />, label: "Cập nhật" },
            {
              key: "2",
              icon: item.hidden ? <Eye size={16} /> : <EyeOff size={16} />,
              label: item.hidden ? "Hiện phòng chiếu" : "Ẩn phòng chiếu"
            }
          ]
        : []),
      ...(canConfigure ? [{ key: "3", icon: <Armchair size={16} />, label: "Xem sơ đồ ghế" }] : []),
      ...(canDelete ? [{ key: "4", icon: <Trash2 size={16} />, label: "Xóa", danger: true }] : [])
    ],
    [canConfigure, canDelete, canUpdate]
  );

  const columns: TableProps<RoomProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
      width: 50,
      fixed: "left"
    },
    {
      title: "Phòng chiếu",
      key: "name",
      dataIndex: "name",
      width: 250,
      sorter: (a, b) => compareText(a.name, b.name)
    },
    {
      title: "Số tầng",
      key: "numberOfFloor",
      dataIndex: "numberOfFloor",
      align: "right",
      sorter: (a, b) => compareNumber(a.numberOfFloor, b.numberOfFloor)
    },
    {
      title: "Số hàng Tầng 1",
      key: "deepSizeF1",
      dataIndex: "deepSizeF1",
      align: "right",
      sorter: (a, b) => compareNumber(a.deepSizeF1, b.deepSizeF1)
    },
    {
      title: "Số ghế Tầng 1",
      key: "wideSizeF1",
      dataIndex: "wideSizeF1",
      align: "right",
      sorter: (a, b) => compareNumber(a.wideSizeF1, b.wideSizeF1)
    },
    {
      title: "Số hàng Tầng 2",
      key: "deepSizeF2",
      dataIndex: "deepSizeF2",
      align: "right",
      sorter: (a, b) => compareNumber(a.deepSizeF2, b.deepSizeF2)
    },
    {
      title: "Số ghế Tầng 2",
      key: "wideSizeF2",
      dataIndex: "wideSizeF2",
      align: "right",
      sorter: (a, b) => compareNumber(a.wideSizeF2, b.wideSizeF2)
    },
    {
      title: "Số hàng Tầng 3",
      key: "deepSizeF3",
      dataIndex: "deepSizeF3",
      align: "right",
      sorter: (a, b) => compareNumber(a.deepSizeF3, b.deepSizeF3)
    },
    {
      title: "Số ghế Tầng 3",
      key: "wideSizeF3",
      dataIndex: "wideSizeF3",
      align: "right",
      sorter: (a, b) => compareNumber(a.wideSizeF3, b.wideSizeF3)
    },
    {
      title: "Quy luật xếp ghế",
      key: "ruleOrder",
      dataIndex: "ruleOrder",
      sorter: (a, b) => compareText(a.ruleOrder, b.ruleOrder)
    },
    {
      title: "Ẩn/Hiện",
      key: "hidden",
      dataIndex: "hidden",
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
      sorter: (a, b) => Number(a.hidden) - Number(b.hidden)
    },
    ...(canUpdate || canConfigure || canDelete
      ? [
          {
            title: "",
            key: "operation",
            width: 50,
            render: (_: unknown, record: RoomProps) => (
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
                      navigate(`/screening-rooms/${record.id}/seat-map`);
                    }
                    if (e.key === "4") {
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
              Thêm phòng chiếu
            </Button>
          ) : undefined
        }
      />

      <AutoHeightTable
        rowKey={(record) => record.id}
        dataSource={screeningRooms?.data || []}
        columns={columns}
        bordered
        size="small"
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
          showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`
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

      {changeHiddenDialogOpen && selectedScreeningRoom && (
        <ChangeHiddenScreeningRoomDialog
          name={selectedScreeningRoom.name}
          room={selectedScreeningRoom}
          onOpenChange={handleChangeHiddenDialogClose}
          open={changeHiddenDialogOpen}
        />
      )}
    </div>
  );
};

export default ScreeningRoomsPage;
