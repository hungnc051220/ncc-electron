import { MoreOutlined } from "@ant-design/icons";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import { formatMoney, formatNumber } from "@renderer/lib/utils";
import type { PaperVoucherBatch, PaperVoucherSortField } from "@shared/types";
import type { MenuProps, PaginationProps, TableProps } from "antd";
import { Button, Dropdown, Empty, Tag } from "antd";
import { Eye, Lock, LockOpen, SquarePen, Trash2 } from "lucide-react";
import type { Key } from "react";
import {
  formatPaperVoucherDate,
  getPaperVoucherAmounts,
  getPaperVoucherStatus,
  PAPER_VOUCHER_NO_EXPIRY_LABEL,
  PAPER_VOUCHER_STATUS_META
} from "../paperVoucher.utils";
import type { PaperVoucherPermissions } from "../paperVoucherPermissions";
import PaperVoucherThumbnail from "./PaperVoucherThumbnail";

export type PaperVoucherTableSort = {
  field: PaperVoucherSortField;
  order: "ascend" | "descend";
} | null;

const SORT_FIELDS: PaperVoucherSortField[] = [
  "batchCode",
  "name",
  "faceValue",
  "totalQuantity",
  "usedCount",
  "remainingQuantity",
  "validFrom",
  "expiresAt"
];

const isSortField = (columnKey: Key | undefined): columnKey is PaperVoucherSortField =>
  typeof columnKey === "string" && SORT_FIELDS.includes(columnKey as PaperVoucherSortField);

interface PaperVoucherTableProps {
  dataSource: PaperVoucherBatch[];
  total: number;
  loading: boolean;
  today: string;
  permissions: PaperVoucherPermissions;
  hasFilters: boolean;
  /** Lỗi tải danh sách từ API; hiển thị thay cho trạng thái rỗng. */
  loadError?: string | null;
  current: number;
  pageSize: number;
  sort: PaperVoucherTableSort;
  onSortChange: (sort: PaperVoucherTableSort) => void;
  onPaginationChange: (current: number, pageSize: number) => void;
  onView: (batch: PaperVoucherBatch) => void;
  onEdit: (batch: PaperVoucherBatch) => void;
  onToggleLock: (batch: PaperVoucherBatch) => void;
  onDelete: (batch: PaperVoucherBatch) => void;
}

const PaperVoucherTable = ({
  dataSource,
  total,
  loading,
  today,
  permissions,
  hasFilters,
  loadError,
  current,
  pageSize,
  sort,
  onSortChange,
  onPaginationChange,
  onView,
  onEdit,
  onToggleLock,
  onDelete
}: PaperVoucherTableProps) => {
  const getActionItems = (record: PaperVoucherBatch): NonNullable<MenuProps["items"]> => [
    ...(permissions.view ? [{ key: "view", icon: <Eye size={16} />, label: "Xem chi tiết" }] : []),
    ...(permissions.update
      ? [
          { key: "edit", icon: <SquarePen size={16} />, label: "Chỉnh sửa" },
          record.isLocked
            ? { key: "unlock", icon: <LockOpen size={16} />, label: "Mở khóa" }
            : { key: "lock", icon: <Lock size={16} />, label: "Khóa lô" }
        ]
      : []),
    ...(permissions.delete
      ? [
          {
            key: "delete",
            icon: <Trash2 size={16} />,
            label: record.usedCount > 0 ? "Xóa lô (đã có lượt sử dụng)" : "Xóa lô",
            danger: true,
            disabled: record.usedCount > 0
          }
        ]
      : [])
  ];

  const hasAnyAction = permissions.view || permissions.update || permissions.delete;

  /** Sắp xếp phía server, áp dụng cho toàn bộ kết quả chứ không chỉ trang hiện tại. */
  const serverSorter = (field: PaperVoucherSortField) => ({
    sorter: true,
    sortOrder: sort?.field === field ? sort.order : null
  });

  const handleTableChange: TableProps<PaperVoucherBatch>["onChange"] = (_, __, sorter, extra) => {
    if (extra.action !== "sort") return;

    const currentSorter = Array.isArray(sorter) ? sorter[0] : sorter;
    onSortChange(
      isSortField(currentSorter?.columnKey) && currentSorter.order
        ? { field: currentSorter.columnKey, order: currentSorter.order }
        : null
    );
  };

  // Header không xuống dòng: width mỗi cột phải chứa đủ tiêu đề + icon sort, nếu không header
  // tự nở rộng hơn body và các cột phía sau bị lệch.
  const columns: TableProps<PaperVoucherBatch>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
      width: 56,
      fixed: "left"
    },
    {
      title: "Mã lô",
      key: "batchCode",
      dataIndex: "batchCode",
      width: 110,
      fixed: "left",
      ...serverSorter("batchCode"),
      render: (value: string) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">{value}</span>
      )
    },
    {
      title: "Tên lô",
      key: "name",
      dataIndex: "name",
      width: 220,
      ...serverSorter("name"),
      render: (value: string) => <span className="text-slate-700 dark:text-slate-200">{value}</span>
    },
    {
      title: "Ảnh voucher",
      key: "images",
      width: 108,
      align: "center",
      render: (_, record) => <PaperVoucherThumbnail batch={record} />
    },
    {
      title: "Mệnh giá",
      key: "faceValue",
      dataIndex: "faceValue",
      width: 130,
      align: "right",
      ...serverSorter("faceValue"),
      render: (value: number) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {formatMoney(value || 0)}
        </span>
      )
    },
    {
      title: "Tổng số lượng",
      key: "totalQuantity",
      dataIndex: "totalQuantity",
      width: 136,
      align: "right",
      ...serverSorter("totalQuantity"),
      render: (value: number) => formatNumber(value || 0)
    },
    {
      title: "Đã sử dụng",
      key: "usedCount",
      dataIndex: "usedCount",
      width: 140,
      align: "right",
      ...serverSorter("usedCount"),
      render: (value: number, record) => {
        const percent = record.totalQuantity ? Math.round((value / record.totalQuantity) * 100) : 0;

        return (
          <span>
            {formatNumber(value || 0)}
            <span className="ml-1.5 text-xs text-slate-400 dark:text-slate-500">{percent}%</span>
          </span>
        );
      }
    },
    {
      title: "Chưa sử dụng",
      key: "remainingQuantity",
      width: 136,
      align: "right",
      ...serverSorter("remainingQuantity"),
      render: (_, record) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {formatNumber(getPaperVoucherAmounts(record).remainingQuantity)}
        </span>
      )
    },
    {
      title: "Hạn sử dụng",
      key: "validity",
      align: "center",
      children: [
        {
          title: "Từ ngày",
          key: "validFrom",
          dataIndex: "validFrom",
          width: 108,
          align: "center",
          ...serverSorter("validFrom"),
          render: (value?: string | null) => formatPaperVoucherDate(value)
        },
        {
          title: "Đến ngày",
          key: "expiresAt",
          dataIndex: "expiresAt",
          width: 108,
          align: "center",
          ...serverSorter("expiresAt"),
          render: (value?: string | null) =>
            value ? (
              formatPaperVoucherDate(value)
            ) : (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {PAPER_VOUCHER_NO_EXPIRY_LABEL}
              </span>
            )
        }
      ]
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 170,
      render: (_, record) => {
        const meta = PAPER_VOUCHER_STATUS_META[getPaperVoucherStatus(record, today)];
        return <Tag color={meta.color}>{meta.label}</Tag>;
      }
    },
    ...(hasAnyAction
      ? [
          {
            title: "",
            key: "operation",
            width: 56,
            align: "center" as const,
            fixed: "right" as const,
            render: (_: unknown, record: PaperVoucherBatch) => (
              <Dropdown
                menu={{
                  items: getActionItems(record),
                  onClick: ({ key, domEvent }) => {
                    domEvent.stopPropagation();
                    if (key === "view") onView(record);
                    if (key === "edit") onEdit(record);
                    if (key === "lock" || key === "unlock") onToggleLock(record);
                    if (key === "delete") onDelete(record);
                  }
                }}
                arrow
                trigger={["click"]}
              >
                <Button
                  type="text"
                  size="small"
                  icon={<MoreOutlined />}
                  aria-label={`Thao tác lô ${record.batchCode}`}
                />
              </Dropdown>
            )
          }
        ]
      : [])
  ];

  const onShowSizeChange: PaginationProps["onShowSizeChange"] = (page, size) => {
    onPaginationChange(page, size);
  };

  return (
    <AutoHeightTable
      rowKey="id"
      dataSource={dataSource}
      columns={columns}
      bordered
      size="small"
      loading={loading}
      onChange={handleTableChange}
      locale={{
        emptyText: (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              loadError ??
              (hasFilters ? "Không có lô voucher phù hợp với bộ lọc" : "Chưa có lô voucher giấy")
            }
          />
        )
      }}
      pagination={{
        current,
        pageSize,
        onChange: onPaginationChange,
        onShowSizeChange,
        total,
        size: "middle",
        pageSizeOptions: [20, 50, 100],
        showSizeChanger: true,
        showTotal: (count) => `Tổng ${formatNumber(count)} bản ghi`
      }}
    />
  );
};

export default PaperVoucherTable;
