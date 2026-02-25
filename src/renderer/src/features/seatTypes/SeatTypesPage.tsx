import Icon, { MoreOutlined } from "@ant-design/icons";
import { useSeatTypes } from "@renderer/hooks/seatTypes/useSeatTypes";
import { formatNumber } from "@renderer/lib/utils";
import { SeatTypeProps } from "@shared/types";
import type { PaginationProps, TableProps } from "antd";
import { Breadcrumb, Button, ColorPicker, Dropdown, Table } from "antd";
import { Check, PlusIcon, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import DeleteSeatTypeDialog from "./components/DeleteSeatTypeDialog";
import SeatTypesDialog from "./components/SeatTypeDialog";
import { Link } from "react-router";

const actionItems = [
  { key: "1", label: "Cập nhật" },
  { key: "2", label: <p className="text-red-500">Xóa</p> }
];

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
      dataIndex: "positionCode"
    },
    {
      title: "Loại ghế, vị trí",
      key: "name",
      dataIndex: "name"
    },
    {
      title: "Là ghế ngồi",
      key: "isSeat",
      dataIndex: "isSeat",
      render: (value: boolean) =>
        value ? <Check className="size-4 text-green-500" /> : <X className="size-4 text-red-500" />
    },
    {
      title: "Mặc định",
      key: "isDefault",
      dataIndex: "isDefault",
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
              title: <Link to="/">Trang chủ</Link>
            },
            {
              title: "Quản lý danh sách"
            },
            {
              title: "Danh sách loại ghế, vị trí"
            }
          ]}
        />

        <div className="flex gap-2 items-center">
          <Button type="primary" onClick={handleAdd} icon={<Icon component={PlusIcon} />}>
            Thêm loại ghế, vị trí
          </Button>
        </div>
      </div>

      <Table
        rowKey={(record) => record.id}
        dataSource={seatTypes?.data || []}
        columns={columns}
        bordered
        size="small"
        scroll={{ x: "max-content", y: "calc(100vh - 265px)" }}
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
