"use client";

import Icon, { MoreOutlined } from "@ant-design/icons";
import { useDiscounts } from "@renderer/hooks/discounts/useDiscounts";
import { formatMoney, formatNumber } from "@renderer/lib/utils";
import { DiscountProps } from "@renderer/types";
import type { PaginationProps, TableProps } from "antd";
import { Breadcrumb, Button, Dropdown, Table } from "antd";
import { PlusIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router";
import DeleteDiscountDialog from "./components/DeleteDiscountDialog";
import DiscountSettingsDialog from "./components/DiscountSettingsDialog";

const actionItems = [
  { key: "1", label: "Cập nhật" },
  { key: "2", label: <p className="text-red-500">Xóa</p> }
];

const DiscountSettingsPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedDiscount, setSelectedDiscount] = useState<DiscountProps | null>(null);

  const params = useMemo(
    () => ({
      current,
      pageSize
    }),
    [current, pageSize]
  );

  const { data: discounts, isFetching } = useDiscounts(params);

  const handleAdd = useCallback(() => {
    setSelectedDiscount(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((item: DiscountProps) => {
    setSelectedDiscount(item);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback((item: DiscountProps) => {
    setSelectedDiscount(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedDiscount(null);
    }
  }, []);

  const handleDeleteDialogClose = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setSelectedDiscount(null);
    }
  }, []);

  const columns: TableProps<DiscountProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
      width: 50,
      fixed: "left"
    },
    {
      title: "Khuyến mại, giảm giá",
      key: "discountName",
      dataIndex: "discountName"
    },
    {
      title: "Hình thức",
      key: "discountType",
      dataIndex: "discountType"
    },
    {
      title: "Số tiền",
      key: "discountAmount",
      dataIndex: "discountAmount",
      render: (value: number) => (value ? formatMoney(value) : ""),
      align: "right"
    },
    {
      title: "Tỷ lệ",
      key: "discountRate",
      dataIndex: "discountRate",
      render: (value: number) => (value ? `${formatNumber(value)}%` : ""),
      align: "right"
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
              title: "Kế hoạch chiếu phim"
            },
            {
              title: "Thiết lập giảm giá"
            }
          ]}
        />

        <div className="flex gap-2 items-center">
          <Button type="primary" onClick={handleAdd} icon={<Icon component={PlusIcon} />}>
            Thêm giảm giá
          </Button>
        </div>
      </div>

      <Table
        rowKey={(record) => record.id}
        dataSource={discounts?.data || []}
        columns={columns}
        bordered
        size="small"
        scroll={{ x: "max-content", y: "calc(100vh - 265px)" }}
        loading={isFetching}
        pagination={{
          current,
          onChange,
          total: discounts?.total || 0,
          size: "middle",
          pageSize,
          pageSizeOptions: [20, 50, 100],
          showSizeChanger: true,
          onShowSizeChange,
          showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`
        }}
      />

      {dialogOpen && (
        <DiscountSettingsDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          editingDiscount={selectedDiscount}
        />
      )}
      {selectedDiscount && deleteDialogOpen && (
        <DeleteDiscountDialog
          open={deleteDialogOpen}
          onOpenChange={handleDeleteDialogClose}
          id={selectedDiscount.id}
          name={selectedDiscount.discountName}
        />
      )}
    </div>
  );
};

export default DiscountSettingsPage;
