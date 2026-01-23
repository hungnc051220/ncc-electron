"use client";

import { getCancellationReasons } from "@/data/loaders";
import { formatNumber } from "@/lib/utils";
import { CancellationReasonProps } from "@/types";
import Icon, { MoreOutlined } from "@ant-design/icons";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { PaginationProps, TableProps } from "antd";
import { Breadcrumb, Button, Dropdown, Table } from "antd";
import { PlusIcon } from "lucide-react";
import { useCallback, useState } from "react";
import CancellationReasonDialog from "./cancellation-reason-dialog";
import DeleteCancellationReasonDialog from "./delete-cancellation-reason-dialog";

const actionItems = [
  { key: "1", label: "Cập nhật" },
  { key: "2", label: <p className="text-red-500">Xóa</p> },
];

const CancellationReasonsClient = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(true);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedCancellationReason, setSelectedCancellationReason] =
    useState<CancellationReasonProps | null>(null);

  const { data: cancellationReasons, isFetching } = useQuery({
    queryKey: ["cancellation-reasons", { current, pageSize }],
    queryFn: () => {
      return getCancellationReasons({
        page: current,
        pageSize,
      });
    },
    placeholderData: keepPreviousData,
  });

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

  const columns: TableProps<CancellationReasonProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => (current - 1) * 100 + index + 1,
      width: 50,
      fixed: "left",
    },
    {
      title: "Lý do hủy",
      key: "reason",
      dataIndex: "reason",
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
              title: "Danh sách lý do hủy vé",
            },
          ]}
        />

        <div className="flex gap-2 items-center">
          <Button
            type="primary"
            onClick={handleAdd}
            icon={<Icon component={PlusIcon} />}
          >
            Thêm lý do hủy vé
          </Button>
        </div>
      </div>

      <Table
        rowKey={(record) => record.id}
        dataSource={cancellationReasons?.data || []}
        columns={columns}
        bordered
        size="small"
        scroll={{ x: "max-content", y: "calc(100vh - 220px)" }}
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
          showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`,
          hideOnSinglePage: true,
        }}
      />

      {dialogOpen && (
        <CancellationReasonDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          editingCancellationReason={selectedCancellationReason}
        />
      )}
      {selectedCancellationReason && (
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

export default CancellationReasonsClient;
