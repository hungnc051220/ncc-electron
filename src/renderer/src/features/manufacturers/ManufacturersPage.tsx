import Icon, { MoreOutlined } from "@ant-design/icons";
import { useManufacturers } from "@renderer/hooks/manufacturers/useManufacturers";
import { ManufacturerProps } from "@renderer/types";
import type { PaginationProps, TableProps } from "antd";
import { Breadcrumb, Button, Dropdown, Table } from "antd";
import { PlusIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import DeleteManufacturerDialog from "./components/DeleteManufacturerDialog";
import ManufacturerDialog from "./components/ManufacturerDialog";
import { formatNumber } from "@renderer/lib/utils";
import { Link } from "react-router";

const actionItems = [
  { key: "1", label: "Cập nhật" },
  { key: "2", label: <p className="text-red-500">Xóa</p> }
];

const ManufacturersPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedManufacturer, setSelectedManufacturer] = useState<ManufacturerProps | null>(null);

  const params = useMemo(
    () => ({
      current,
      pageSize
    }),
    [current, pageSize]
  );

  const { data: manufacturers, isFetching } = useManufacturers(params);

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
      fixed: "left"
    },
    {
      title: "Tên công ty",
      key: "fullName",
      dataIndex: "fullName"
    },
    {
      title: "Địa chỉ công ty",
      key: "address",
      dataIndex: "address"
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
              title: "Danh sách hãng phim"
            }
          ]}
        />

        <div className="flex gap-2 items-center">
          <Button type="primary" onClick={handleAdd} icon={<Icon component={PlusIcon} />}>
            Thêm hãng phim
          </Button>
        </div>
      </div>

      <Table
        rowKey={(record) => record.id}
        dataSource={manufacturers?.data || []}
        columns={columns}
        bordered
        size="small"
        scroll={{ x: "max-content", y: "calc(100vh - 265px)" }}
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
    </div>
  );
};

export default ManufacturersPage;
