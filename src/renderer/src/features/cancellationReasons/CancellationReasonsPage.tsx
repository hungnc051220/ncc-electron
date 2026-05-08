import Icon, { MoreOutlined } from "@ant-design/icons";
import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import { useCancellationReasons } from "@renderer/hooks/cancellationReasons/useCancellationReasons";
import { formatNumber, compareText } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { CancellationReasonProps } from "@shared/types";
import type { PaginationProps, TableProps } from "antd";
import { Button, Dropdown } from "antd";
import { PlusIcon, SquarePen, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import CancellationReasonDialog from "./components/CancellationReasonDialog";
import DeleteCancellationReasonDialog from "./components/DeleteCancellationReasonDialog";

const CancellationReasonsPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedCancellationReason, setSelectedCancellationReason] =
    useState<CancellationReasonProps | null>(null);

  const params = useMemo(
    () => ({
      current,
      pageSize
    }),
    [current, pageSize]
  );

  const { data: cancellationReasons, isFetching } = useCancellationReasons(params);
  const { can } = usePermission();
  const canCreate = can("cancellation_reasons", "create");
  const canUpdate = can("cancellation_reasons", "update");
  const canDelete = can("cancellation_reasons", "delete");

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
    ...(canUpdate ? [{ key: "1", icon: <SquarePen size={16} />, label: "Cập nhật" }] : []),
    ...(canDelete ? [{ key: "2", icon: <Trash2 size={16} />, label: "Xóa", danger: true }] : [])
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
      title: "Lý do hủy",
      key: "reason",
      dataIndex: "reason",
      sorter: (a, b) => compareText(a.reason, b.reason)
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

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-4 pt-4">
      <PageHeader
        left={<AppBreadcrumb />}
        right={
          canCreate ? (
            <Button type="primary" onClick={handleAdd} icon={<Icon component={PlusIcon} />}>
              Thêm lý do hủy vé
            </Button>
          ) : undefined
        }
      />

      <AutoHeightTable
        rowKey={(record) => record.id}
        dataSource={cancellationReasons?.data || []}
        columns={columns}
        bordered
        size="small"
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

export default CancellationReasonsPage;
