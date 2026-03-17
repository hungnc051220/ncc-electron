import Icon, { MoreOutlined } from "@ant-design/icons";
import { useCancellationReasons } from "@renderer/hooks/cancellationReasons/useCancellationReasons";
import { formatNumber } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { CancellationReasonProps } from "@shared/types";
import type { PaginationProps, TableProps } from "antd";
import { Breadcrumb, Button, Dropdown, Table } from "antd";
import { PlusIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import CancellationReasonDialog from "./components/RevenueSharingDialog";
import DeleteCancellationReasonDialog from "./components/DeleteRevenueSharingDialog";
import { Link } from "react-router";
import Filter from "./components/Filter";
import ExportButton from "./components/ExportExcel";

export interface ValuesProps {
  manufacturerId?: number;
  filmId?: number;
}

const RevenueSharingPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedCancellationReason, setSelectedCancellationReason] =
    useState<CancellationReasonProps | null>(null);
  const [filterValues, setFilterValues] = useState<ValuesProps>({});

  const params = useMemo(
    () => ({
      current,
      pageSize
    }),
    [current, pageSize]
  );

  const { data: cancellationReasons, isFetching } = useCancellationReasons(params);
  const { can } = usePermission();
  const canCreate = can("revenue_sharing", "create");
  const canUpdate = can("revenue_sharing", "update");
  const canDelete = can("revenue_sharing", "delete");

  const handleAdd = useCallback(() => {
    setSelectedCancellationReason(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((item: CancellationReasonProps) => {
    setSelectedCancellationReason(item);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback((item: CancellationReasonProps) => {
    setSelectedCancellationReason(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedCancellationReason(null);
    }
  }, []);

  const handleDeleteDialogClose = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setSelectedCancellationReason(null);
    }
  }, []);

  const actionItems = [
    ...(canUpdate ? [{ key: "1", label: "Cập nhật" }] : []),
    ...(canDelete ? [{ key: "2", label: <p className="text-red-500">Xóa</p> }] : [])
  ];

  const columns: TableProps<CancellationReasonProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
      width: 50,
      fixed: "left"
    },
    {
      title: "Hãng phim",
      key: "manufacturer",
      dataIndex: "manufacturer"
    },
    {
      title: "Tên phim",
      key: "filmName",
      dataIndex: "filmName"
    },
    {
      title: "Ngày phát hành",
      key: "premierDay",
      dataIndex: "premierDay"
    },
    {
      title: "Doanh thu NCC",
      key: "revenueNCC",
      dataIndex: "revenueNCC"
    },
    {
      title: "Doanh thu chủ phim",
      key: "revenueManufacturer",
      dataIndex: "revenueManufacturer"
    },
    {
      title: "Doanh thu",
      key: "revenue",
      dataIndex: "revenue"
    },
    ...(actionItems.length
      ? [
          {
            title: "",
            key: "operation",
            width: 50,
            render: (_: unknown, record: CancellationReasonProps) => (
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

  const onSearch = (values: ValuesProps) => {
    setFilterValues(values);
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
              title: "Quản lý phân chia doanh thu"
            }
          ]}
        />

        <div className="flex gap-2 items-center">
          <Filter filterValues={filterValues} onSearch={onSearch} />
          <ExportButton />
          {canCreate && (
            <Button type="primary" onClick={handleAdd} icon={<Icon component={PlusIcon} />}>
              Thêm mới
            </Button>
          )}
        </div>
      </div>

      <Table
        rowKey={(record) => record.id}
        dataSource={[]}
        columns={columns}
        bordered
        size="small"
        scroll={{ x: "max-content", y: "calc(100vh - 265px)" }}
        loading={isFetching}
        pagination={{
          current,
          onChange,
          total: cancellationReasons?.total || 0,
          size: "middle",
          pageSize,
          pageSizeOptions: [20, 50, 100],
          showSizeChanger: true,
          onShowSizeChange,
          showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`
        }}
      />

      {dialogOpen && (
        <CancellationReasonDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          editingCancellationReason={selectedCancellationReason}
        />
      )}
      {selectedCancellationReason && deleteDialogOpen && (
        <DeleteCancellationReasonDialog
          open={deleteDialogOpen}
          onOpenChange={handleDeleteDialogClose}
          id={selectedCancellationReason.id}
          name={selectedCancellationReason.reason}
        />
      )}
    </div>
  );
};

export default RevenueSharingPage;
