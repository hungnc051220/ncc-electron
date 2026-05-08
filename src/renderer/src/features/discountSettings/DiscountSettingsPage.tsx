import Icon, { MoreOutlined } from "@ant-design/icons";
import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import { useDiscounts } from "@renderer/hooks/discounts/useDiscounts";
import { formatMoney, formatNumber } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { DiscountProps } from "@shared/types";
import type { PaginationProps, TableProps } from "antd";
import { Button, Dropdown, Image } from "antd";
import { PlusIcon, SquarePen, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import DeleteDiscountDialog from "./components/DeleteDiscountDialog";
import DiscountSettingsDialog from "./components/DiscountSettingsDialog";
import dayjs from "dayjs";

const DiscountSettingsPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedDiscount, setSelectedDiscount] = useState<DiscountProps | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const params = useMemo(
    () => ({
      current,
      pageSize
    }),
    [current, pageSize]
  );

  const { data: discounts, isFetching } = useDiscounts(params);
  const { can } = usePermission();
  const canCreate = can("discount_settings", "create");
  const canUpdate = can("discount_settings", "update");
  const canDelete = can("discount_settings", "delete");

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

  const actionItems = [
    ...(canUpdate ? [{ key: "1", icon: <SquarePen size={16} />, label: "Cập nhật" }] : []),
    ...(canDelete ? [{ key: "2", icon: <Trash2 size={16} />, label: "Xóa", danger: true }] : [])
  ];

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
      title: "Ảnh",
      key: "image",
      dataIndex: "image",
      render: (value: string) =>
        value && (
          <Image
            src={value}
            alt="discount"
            width={40}
            preview={false}
            className="cursor-pointer"
            onClick={() => setPreviewImage(value)}
          />
        )
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
      title: "Thòi gian bắt đầu",
      key: "startDate",
      dataIndex: "startDate",
      render: (value: string) => value && dayjs(value).format("DD/MM/YYYY")
    },
    {
      title: "Thòi gian kết thúc",
      key: "endDate",
      dataIndex: "endDate",
      render: (value: string) => value && dayjs(value).format("DD/MM/YYYY")
    },
    ...(actionItems.length
      ? [
          {
            title: "",
            key: "operation",
            width: 50,
            render: (_: unknown, record: DiscountProps) => (
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
              Thêm giảm giá
            </Button>
          ) : undefined
        }
      />

      <AutoHeightTable
        rowKey={(record) => record.id}
        dataSource={discounts?.data || []}
        columns={columns}
        bordered
        size="small"
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
      {previewImage && (
        <Image
          src={previewImage}
          alt="discount preview"
          style={{ display: "none" }}
          preview={{
            open: Boolean(previewImage),
            src: previewImage,
            onOpenChange: (open) => {
              if (!open) {
                setPreviewImage(null);
              }
            }
          }}
        />
      )}
    </div>
  );
};

export default DiscountSettingsPage;
